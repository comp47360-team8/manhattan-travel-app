//
//  ItineraryViewModel.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import Foundation

@MainActor

final class ItineraryViewModel: ObservableObject {
    @Published var itineraries: [Itinerary] = []
    @Published var isLoading: Bool = false
    @Published var errorMessage: String?
    
    private let service = ItineraryService()
    private let itineraryService = ItineraryService()
    
    func load(force: Bool = false) async {
        guard force || itineraries.isEmpty else { return }
        if itineraries.isEmpty {
            isLoading = true
        }
        errorMessage = nil
        do { itineraries = try await service.fetchItineraries() }
        catch is CancellationError {}
        catch { errorMessage = error.localizedDescription }
        isLoading = false
    }
    
    func delete(_ itinerary: Itinerary) async{
        let backup = itineraries
        itineraries.removeAll{ $0.id == itinerary.id }
        do { try await service.deleteItinerary(id: itinerary.id) }
        catch { itineraries = backup
                errorMessage = error.localizedDescription}
    }
    
    func getItinerary(_ id: String) async {
        errorMessage = nil
        do { try await itineraryService.fetchItinerary(id: id)}
        catch is CancellationError {}
        catch { error.localizedDescription }
    }
    
}
