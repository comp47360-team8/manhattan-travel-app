//
//  POIDetailViewModel.swift
//  ManhattanTravelApp
//
//  Created by Sean on 30/06/2026.
//
import Foundation

@MainActor
final class POIDetailViewModel: ObservableObject {
    @Published var poi: POIDetail?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = POIService()

    func load(slug: String) async {
        guard poi == nil else { return }
        isLoading = true; errorMessage = nil
        do { poi = try await service.fetchPOI(slug: slug) }
        catch { errorMessage = error.localizedDescription }
        isLoading = false
    }
}
