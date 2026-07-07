//
//  SavedPOIService.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import Foundation
//
//struct SavedPOIService {
//    private let baseURL = APIConfig.baseURL
//    
//    func fetchSavedPOIs() async throws -> [POI] {
//        let (data, response) = try await send(path: "/api/users/me/saved-pois", method: "GET")
//        try Self.validate(response)
//        
//        let decoder = JSONDecoder()
//        decoder.keyDecodingStrategy = .convertFromSnakeCase
//        do {
//            return try decoder.decode([POI].self, from: data)
//        }catch{
//            throw NetworkError.decoding
//        }
//    }
//    
//    func save(slug: String) async throws {
//        let (_, response) = try await send(path: "/api/pois/\(slug)/save", method: "POST")
//        try Self.validate(response)
//    }
//    
//    func unsave(slug: String) async throws {
//        let (_, response) = try await send(path: "/api/pois/\(slug)/save", method: "DELETE")
//        try Self.validate(response)
//    }
//    
//    private func send(path: String, method: String) async throws  -> (Data, URLResponse) {
//        guard let token = TokenStore.accessToken else {
//            throw NetworkError.unauthorized}
//        
//        var request = URLRequest(url: baseURL.appendingPathComponent(path))
//        request.httpMethod = method
//        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
//        
//        do{
//            return try await URLSession.shared.data(for: request)
//        } catch {
//            throw NetworkError.network
//        }
//        
//    }
//    
//    private static func validate(_ response: URLResponse) throws {
//            guard let http = response as? HTTPURLResponse else {
//                throw NetworkError.decoding
//            }
//            switch http.statusCode {
//            case 200..<300: return
//            case 404: throw NetworkError.notFound
//            case 401: throw NetworkError.unauthorized
//            case 500: throw NetworkError.serverError
//            default: throw NetworkError.network
//            }
//        }
//    
//    
//}


struct SavedPOIService {
    func fetchSavedPOIs() async throws -> [POI] { try await APIClient.shared.get("/api/users/me/saved-pois", authenticated: true) }
    func save(slug: String)   async throws { try await APIClient.shared.post("/api/pois/\(slug)/save", authenticated: true) }
    func unsave(slug: String) async throws { try await APIClient.shared.delete("/api/pois/\(slug)/save", authenticated: true) }
}
