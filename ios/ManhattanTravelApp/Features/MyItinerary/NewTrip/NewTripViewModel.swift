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

    // generate a new itinerary
    @Published var generated: APIItinerary?
    @Published var errorMessage: String?
    @Published var isSaving: Bool = false

    /// When set, this is an *edit*: after the new itinerary saves, the old one
    /// (this id) is deleted so the list shows the edited version, not a duplicate.
    var editingItineraryId: String?
    /// The POI set the edit started from — used to skip regeneration on a no-op edit.
    var originalSelectionSlugs: Set<String>?
    /// The already-loaded itinerary, reused verbatim when the edit changes nothing.
    var originalResult: OptimizedItinerary?
    
    private var tripDateStrings: [String] {
        [startDate, endDate].compactMap { $0 }.map(Self.apiDate.string)  // → [start, end]
    }
    
    private let itineraryService = ItineraryService()
    
    
    


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
    func generate() async {
        guard let start = startDate, !selectedPOIs.isEmpty else { return }

        // Editing but the POI selection is unchanged → reuse the existing itinerary,
        // don't save a duplicate.
        if editingItineraryId != nil,
           let baseline = originalSelectionSlugs,
           baseline == Set(selectedPOIs.map(\.slug)),
           let existing = originalResult {
            result = existing
            return
        }

        let trimmed = name.trimmingCharacters(in: .whitespaces)
        
        let request = GenerateItineraryRequest(
            tripName: trimmed.isEmpty ? "My Trip" : trimmed,
            tripDates: tripDateStrings,
            pois: selectedPOIs.map(\.slug),
            accessibility: []
        )
        
        do {
            let dto = try await itineraryService.generate(request)
            let saved = try await itineraryService.save(dto)
            // Editing: drop the previously-saved version now that the new one exists.
            if let oldId = editingItineraryId {
                try? await itineraryService.deleteItinerary(id: oldId)
            }
            // Track the newly-saved id so a further regenerate in the same session
            // replaces this one too (instead of leaving a duplicate).
            editingItineraryId = saved.itineraryId
            result = OptimizedItinerary.from(dto, startDate: start) // for UI view
        } catch is CancellationError {
        } catch {
            errorMessage = error.localizedDescription
        }
        
    }
    

    
    
    private static let apiDate: DateFormatter = {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    

    
}
