//
//  ExploreViewModel.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//

import Foundation

@MainActor
final class ExploreViewModel: ObservableObject {
    @Published var pois: [POI] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = POIService()
    private let cacheKey = "cachedPOIs"
    private let cacheDateKey = "cachedPOIsDate"
    private let cacheMaxAge: TimeInterval = 48 * 60 * 60  

    func loadPOIs(force: Bool = false) async {
        guard force || pois.isEmpty else { return }

        
        if pois.isEmpty, let cached = loadCache() {
            pois = cached
        }

        if pois.isEmpty { isLoading = true }
        errorMessage = nil
        do {
            let fresh = try await service.fetchPOIs()
            pois = fresh
            saveCache(fresh)
        } catch is CancellationError {
        } catch {
            if pois.isEmpty { errorMessage = error.localizedDescription }  
        }
        isLoading = false
    }

    private func saveCache(_ pois: [POI]) {
        if let data = try? JSONEncoder().encode(pois) {
            UserDefaults.standard.set(data, forKey: cacheKey)
            UserDefaults.standard.set(Date(), forKey: cacheDateKey)  
        }
    }

    private func loadCache() -> [POI]? {
        guard let savedAt = UserDefaults.standard.object(forKey: cacheDateKey) as? Date,
              Date().timeIntervalSince(savedAt) < cacheMaxAge,        
              let data = UserDefaults.standard.data(forKey: cacheKey) else { return nil }
        return try? JSONDecoder().decode([POI].self, from: data)
    }
}
