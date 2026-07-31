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
        // Only publish when it actually changes: assigning the same value still
        // fires objectWillChange, which rebuilds the view and cancels the
        // in-flight `.refreshable` task (pull-to-refresh then does nothing).
        if errorMessage != nil { errorMessage = nil }
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
        // Encode + write off the main thread so it doesn't delay the first paint:
        // the cards should show the instant `pois` is set, with the 600KB cache
        // write happening in the background.
        let key = cacheKey, dateKey = cacheDateKey
        Task.detached(priority: .utility) {
            // Busyness is time-sensitive ("NOW"); don't persist it, or an offline
            // launch would show a hours-old level as if it were live. Strip it so
            // cached cards simply omit the indicator until a fresh fetch fills it in.
            let stripped = pois.map { poi -> POI in
                var p = poi
                p.currentBusyness = nil
                p.currentBusynessPct = nil
                return p
            }
            guard let data = try? JSONEncoder().encode(stripped) else { return }
            UserDefaults.standard.set(data, forKey: key)
            UserDefaults.standard.set(Date(), forKey: dateKey)
        }
    }

    private func loadCache() -> [POI]? {
        guard let savedAt = UserDefaults.standard.object(forKey: cacheDateKey) as? Date,
              Date().timeIntervalSince(savedAt) < cacheMaxAge,        
              let data = UserDefaults.standard.data(forKey: cacheKey) else { return nil }
        return try? JSONDecoder().decode([POI].self, from: data)
    }
}
