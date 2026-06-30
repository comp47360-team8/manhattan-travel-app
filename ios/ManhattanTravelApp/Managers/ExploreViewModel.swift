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

    func loadPOIs(force: Bool = false) async {
        guard force || pois.isEmpty else { return }
        if pois.isEmpty { isLoading = true }
        errorMessage = nil
        do {
            pois = try await service.fetchPOIs()
        } catch is CancellationError {
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
