//
//  POIService.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//
import Foundation

struct POIService {
    func fetchPOIs() async throws -> [POI] { try await APIClient.shared.get("/api/pois") }
    
    func fetchPOI(slug: String) async throws -> POIDetail { try await       APIClient.shared.get("/api/pois/\(slug)") }
    
    func fetchCrowdForecast(_ slug: String) async throws -> POIBusynessResponse {
        try await APIClient.shared.get("/api/pois/\(slug)/crowd-forecast")
    }
}
