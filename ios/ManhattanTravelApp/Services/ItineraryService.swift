//
//  ItineraryService.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import Foundation
//
//struct ItineraryService {
//    private let baseURL = APIConfig.baseURL
//
//    // API 1: GET 所有行程
//    func fetchItineraries() async throws -> [Itinerary] {
//        // TODO: 后端好了换成真实请求：
//        // let url = baseURL.appendingPathComponent("/api/itineraries")
//        // let (data, response) = try await URLSession.shared.data(from: url)
//        // ...检查状态码 + decode...
//        try await Task.sleep(nanoseconds: 400_000_000)   // 模拟网络延迟
//        return Itinerary.mock
//    }
//
//    // API 3: DELETE 删除行程
//    func deleteItinerary(id: String) async throws {
//        // TODO: DELETE /api/itineraries/{id}
//        try await Task.sleep(nanoseconds: 200_000_000)
//    }
//
//    // API 2: GET 单个行程详情（详情页做的时候用）
//    // func fetchItinerary(id: String) async throws -> ItineraryDetail { ... }
//}

struct ItineraryService {
    
    //MARK: GET itineraries
    func fetchItineraries() async throws -> [Itinerary] { try await APIClient.shared.get("/api/users/me/saved-itineraries", authenticated: true)}
    
    func fetchItinerary(id: String) async throws -> APIItinerary {
        try await APIClient.shared.get("/api/users/me/saved-itineraries/\(id)", authenticated: true)
    }
    
    func deleteItinerary(id: String) async throws { try await APIClient.shared.delete("/api/itinerary/\(id)", authenticated: true) }
    
    func generate(_ request: GenerateItineraryRequest) async throws -> APIItinerary {
        try await APIClient.shared.post("/api/itinerary/generate", body: request)}
    
    @discardableResult
    func save(_ itinerary: APIItinerary) async throws -> MessageResponse {
        try await APIClient.shared.post("/api/itinerary", body: itinerary, authenticated: true) }
    
}

