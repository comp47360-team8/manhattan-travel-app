//
//  NewTripViewModel.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import Foundation

@MainActor
final class NewTripViewModel: ObservableObject {
    @Published var name = ""
    @Published var startDate: Date?
    @Published var endDate: Date?
    @Published var selectedPOIs: [POI] = []      // Step 2 用
    @Published var allPOIs: [POI] = []
    @Published var isLoadingPlaces = false

    // step 3 — optimising
    @Published var optimizeDay = 1               // day currently being optimised
    @Published var result: OptimizedItinerary?   // set when generation finishes
    private let poiService = POIService() // reuse poi service


    var durationDays: Int? {
        guard let s = startDate, let e = endDate else { return nil }
        return (Calendar.current.dateComponents([.day], from: s, to: e).day ?? 0) + 1
    }
    var dateRangeText: String? {
        guard let s = startDate, let e = endDate else { return nil }
        let f = DateFormatter(); f.dateFormat = "MMM d"
        return "\(f.string(from: s)) → \(f.string(from: e))"
    }
    var canContinue: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty && startDate != nil && endDate != nil
    }
    
    // step 2
    /// Max number of places the user can pick (5 per trip day).
    var placeLimit: Int { max((durationDays ?? 0) * 5, 1) }

    func loadPlaces() async {
        guard allPOIs.isEmpty else { return }
        isLoadingPlaces = true
        allPOIs = (try? await poiService.fetchPOIs()) ?? []
        isLoadingPlaces = false
    }

    func isSelected(_ poi: POI) -> Bool { selectedPOIs.contains { $0.id == poi.id } }
    var atLimit: Bool { selectedPOIs.count >= placeLimit }
    func toggle(_ poi: POI) {
        if let i = selectedPOIs.firstIndex(where: { $0.id == poi.id }) {
            selectedPOIs.remove(at: i)
        } else if selectedPOIs.count < placeLimit {
            selectedPOIs.append(poi)
        }
    }
    var canGenerate: Bool { !selectedPOIs.isEmpty }

    // step 3
    /// Runs the (mock) optimisation, advancing `optimizeDay` so the loading
    /// screen can show progress, then publishes `result`.
    /// TODO: swap the mock builder for the backend optimise call.
    func generate() async {
        guard let start = startDate else { return }
        let dayCount = durationDays ?? 1
        result = nil
        for day in 1...dayCount {
            optimizeDay = day
            try? await Task.sleep(nanoseconds: 700_000_000)
        }
        let tripName = name.trimmingCharacters(in: .whitespaces)
        result = OptimizedItinerary.build(name: tripName.isEmpty ? "My Trip" : tripName,
                                          startDate: start, dayCount: dayCount,
                                          pois: selectedPOIs)
    }
}
