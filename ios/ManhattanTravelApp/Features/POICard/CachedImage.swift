//
//  CachedImage.swift
//  ManhattanTravelApp
//
//  Created by Sean on 01/07/2026.
//

import SwiftUI
import CryptoKit


// Two-tier image cache: an in-memory NSCache for instant hits within a run, plus
// a disk cache under Caches/ so images survive app restarts and don't get
// re-downloaded on every cold launch. Image bytes are immutable (the photo URL
// is content-addressed), so cached files never go stale.
final class ImageCache {
    static let shared = ImageCache()

    private let memory = NSCache<NSURL, UIImage>()
    private let directory: URL

    private init() {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        directory = caches.appendingPathComponent("ImageCache", isDirectory: true)
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    // Fast, synchronous memory lookup for the hot path.
    func memoryImage(for url: URL) -> UIImage? {
        memory.object(forKey: url as NSURL)
    }

    // Disk read + decode is not free, so run it off the main actor. A hit is
    // promoted back into memory so the next lookup is instant.
    func diskImage(for url: URL) async -> UIImage? {
        let dir = directory
        let image = await Task.detached(priority: .utility) { () -> UIImage? in
            let path = dir.appendingPathComponent(Self.filename(for: url))
            guard let data = try? Data(contentsOf: path),
                  let image = UIImage(data: data) else { return nil }
            return image
        }.value
        if let image { memory.setObject(image, forKey: url as NSURL) }
        return image
    }

    // Write freshly downloaded bytes to both tiers. The disk write happens off
    // the main actor so it never blocks the first paint.
    func store(_ image: UIImage, data: Data, for url: URL) {
        memory.setObject(image, forKey: url as NSURL)
        let dir = directory
        Task.detached(priority: .utility) {
            let path = dir.appendingPathComponent(Self.filename(for: url))
            try? data.write(to: path)
        }
    }

    // Stable, filesystem-safe filename derived from the full URL string.
    private static func filename(for url: URL) -> String {
        let digest = SHA256.hash(data: Data(url.absoluteString.utf8))
        return digest.map { String(format: "%02x", $0) }.joined()
    }
}

struct CachedImage<Content: View, Placeholder: View>: View {
    let url: URL?
    let content: (Image) -> Content
    let placeholder: () -> Placeholder

    @State private var loadedImage: UIImage?
    @State private var hasFailed = false

    init(
        url: URL?,
        @ViewBuilder content: @escaping (Image) -> Content,
        @ViewBuilder placeholder: @escaping () -> Placeholder
    ){
        self.url = url
        self.content = content
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let loadedImage {
                content(Image(uiImage: loadedImage))
            } else {
                placeholder()
            }
        }
        .task(id: url){
            await loadImage()
        }
    }

    private func loadImage() async {
        // guard url is not empty
        guard let url else {
            hasFailed = true
            return
        }

        // 1. Memory cache — instant.
        if let cached = ImageCache.shared.memoryImage(for: url) {
            loadedImage = cached
            return
        }

        // 2. Disk cache — survives restarts, avoids a network round-trip.
        if let disk = await ImageCache.shared.diskImage(for: url) {
            if Task.isCancelled { return }
            loadedImage = disk
            return
        }

        // 3. Network — download, then populate both cache tiers.
        do {
            let (data, response) = try await URLSession.shared.data(from: url)

            if Task.isCancelled {
                return
            }

            if let http = response as? HTTPURLResponse,
                !(200...299).contains(http.statusCode) {
                    hasFailed = true
                    return
                }

            guard let uiImage = UIImage(data: data) else {
                    hasFailed = true
                    return
                }

            ImageCache.shared.store(uiImage, data: data, for: url)
            loadedImage = uiImage
            hasFailed = false

        } catch {
            if Task.isCancelled { return }
            hasFailed = true
            print("Image loading failed:", error.localizedDescription)
        }
    }
}
