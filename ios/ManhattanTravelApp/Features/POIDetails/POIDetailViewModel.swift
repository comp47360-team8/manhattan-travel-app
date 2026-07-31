//
//  POIDetailViewModel.swift
//  ManhattanTravelApp
//
//  Created by Sean on 30/06/2026.
//
import Foundation

// NSCache only holds classes, but POIDetail is a struct — so wrap it in a
// tiny reference-type box (same trick ImageCache uses to cache UIImage).
final class POIDetailBox {
    let detail: POIDetail
    init(_ detail: POIDetail) { self.detail = detail }
}

// Static POI detail (name, address, hours, images…) barely changes, so cache it
// in memory keyed by slug. Re-opening the same place then paints instantly with
// no network wait. The crowd forecast is deliberately NOT cached here — it's
// "right now" data and must always be fetched fresh.
final class POIDetailCache {
    static let shared = NSCache<NSString, POIDetailBox>()
}

@MainActor
final class POIDetailViewModel: ObservableObject {
    @Published var poi: POIDetail?
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var forecast: POIBusynessResponse?

    private let service = POIService()

    func load(slug: String) async {
        guard poi == nil else { return }

        // Serve the cached static detail immediately if we have it.
        let cached = POIDetailCache.shared.object(forKey: slug as NSString)?.detail
        if let cached { poi = cached }

        // Only show the full-screen spinner when we have nothing to display yet.
        if poi == nil { isLoading = true }
        errorMessage = nil

        do {
            if cached != nil {
                // Static detail already on screen — just refresh the live forecast.
                forecast = try await service.fetchCrowdForecast(slug)
            } else {
                // Nothing cached: fetch static detail and live forecast in
                // parallel so the page appears as fast as the slower of the two,
                // not the sum of both.
                async let poiResult = service.fetchPOI(slug: slug)
                async let forecastResult = service.fetchCrowdForecast(slug)

                let fetched = try await poiResult
                poi = fetched
                POIDetailCache.shared.setObject(POIDetailBox(fetched), forKey: slug as NSString)

                forecast = try await forecastResult
            }
        } catch {
            // Keep any cached detail on screen; only surface an error if the
            // page would otherwise be empty.
            if poi == nil { errorMessage = error.localizedDescription }
        }
        isLoading = false
    }
}
