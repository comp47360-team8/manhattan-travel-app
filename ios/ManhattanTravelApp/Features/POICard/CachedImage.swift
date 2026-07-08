//
//  CachedImage.swift
//  ManhattanTravelApp
//
//  Created by Sean on 01/07/2026.
//

import SwiftUI


final class ImageCache {
    static let shared = NSCache<NSURL, UIImage>()
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
        
        // check if the image already loaded at cache
        if let cached = ImageCache.shared.object(forKey: url as NSURL) {
            loadedImage = cached
            return
        }
        
        // load the image
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
            
            ImageCache.shared.setObject(uiImage, forKey: url as NSURL)
            loadedImage = uiImage
            hasFailed = false
            
        } catch {
            if Task.isCancelled { return }
            hasFailed = true
            print("Image loading failed:", error.localizedDescription)
        }
        
        
        
        
        
        
        
    }
    
    
    
}
