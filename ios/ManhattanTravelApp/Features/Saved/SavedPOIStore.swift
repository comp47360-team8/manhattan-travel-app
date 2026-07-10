//
//  SavedPOIStore.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//
import Foundation
import SwiftUI

@MainActor
final class SavedPOIStore: ObservableObject {
    @Published private(set) var savedPOIs: [POI] = []
    @Published private(set) var savedSlugs: Set<String> = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    private let service = SavedPOIService()
    
    func isSaved(slug: String) -> Bool {
        savedSlugs.contains(slug)
    }
    
    func load(force: Bool = false) async {
        guard force || savedPOIs.isEmpty else { return }
        if savedPOIs.isEmpty { isLoading = true }
        errorMessage = nil
        do {
            savedPOIs = try await service.fetchSavedPOIs()
            savedSlugs = Set(savedPOIs.map(\.slug))
        } catch is CancellationError {
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
    
    
    func toggle(slug: String) async {
        let wasSaved = savedSlugs.contains(slug)
        let previousPOIs = savedPOIs          // snapshot for rollback

        // Optimistic update — reflect the change in the UI immediately.
        withAnimation(.easeInOut(duration: 0.25)) {
            if wasSaved {
                savedSlugs.remove(slug)
                savedPOIs.removeAll { $0.slug == slug }
            } else {
                savedSlugs.insert(slug)
            }
        }

        do {
            if wasSaved {
                try await service.unsave(slug: slug)
            } else {
                try await service.save(slug: slug)
            }
            await load(force: true)
        } catch {
            // Roll back to the pre-toggle state.
            savedPOIs = previousPOIs
            savedSlugs = Set(previousPOIs.map(\.slug))
        }
    }
    
    func reset(){
        savedSlugs.removeAll()
        savedPOIs.removeAll()
        errorMessage = nil
    }

}

#if DEBUG
extension SavedPOIStore {
    /// Preview helper: pre-fills the store so `load()` skips the network.
    static func previewStore(_ pois: [POI]) -> SavedPOIStore {
        let store = SavedPOIStore()
        store.savedPOIs = pois
        store.savedSlugs = Set(pois.map(\.slug))
        return store
    }
}
#endif
