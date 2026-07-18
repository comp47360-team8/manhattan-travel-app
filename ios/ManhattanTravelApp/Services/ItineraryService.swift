//
//  ItineraryService.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import Foundation

struct ItineraryService {
    
    //MARK: GET itineraries
    func fetchItineraries() async throws -> [Itinerary] { try await APIClient.shared.get("/api/users/me/saved-itineraries", authenticated: true)}
    
    func fetchItinerary(id: String) async throws -> APIItinerary {
        try await APIClient.shared.get("/api/users/me/saved-itineraries/\(id)", authenticated: true)
    }
    
    func deleteItinerary(id: String) async throws { try await APIClient.shared.delete("/api/itinerary/\(id)", authenticated: true) }
    
    func generate(_ request: GenerateItineraryRequest) async throws -> APIItinerary {
        try await APIClient.shared.post("/api/itinerary/generate", body: request)}
    
    // POST /api/itinerary echoes back the saved itinerary (ItinerarySavedResponse),
    // not a { message } payload.
    @discardableResult
    func save(_ itinerary: APIItinerary) async throws -> APIItinerary {
        try await APIClient.shared.post("/api/itinerary", body: itinerary, authenticated: true) }
    
}

