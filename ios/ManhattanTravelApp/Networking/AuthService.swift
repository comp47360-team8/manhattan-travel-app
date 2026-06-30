//
//  AuthService.swift
//  ManhattanTravelApp
//
//  Created by Sean on 22/06/2026.
//

import Foundation


struct AuthService {
    private let baseURL = APIConfig.baseURL
    
    
    func signup(_ body: SignUpRequest) async throws -> SignUpResponse {
        try await post(path: "/api/auth/signup", body: body)
    }
    
    func login(_ body: LoginRequest) async throws -> LoginResponse {
        try await post(path: "/api/auth/mobile/login", body: body)
    }
    
    @discardableResult
    func logout(_ body: LogoutRequest) async throws -> LogoutResponse {
        try await post(path: "/api/auth/mobile/logout", body: body)
    }
    
    
    private func post<Body: Encodable, ResponseModel: Decodable>(path: String, body: Body) async throws -> ResponseModel{
        var request = URLRequest(url: baseURL.appendingPathComponent(path))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase // displayName -> display_Name
        request.httpBody = try encoder.encode(body)
        
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw NetworkError.network
        }
        
        guard let http = response as? HTTPURLResponse else {
            throw NetworkError.decoding
        }
        
        
        if (200..<300).contains(http.statusCode) {
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            do {
                return try decoder.decode(ResponseModel.self, from: data)
            } catch {
                throw NetworkError.decoding
            }
            
        }
        
        throw NetworkError.http(status: http.statusCode, detail: Self.extractDetail(from: data))
    }
    
    private static func extractDetail(from data: Data) -> String {
            if let obj = try? JSONDecoder().decode(StringDetail.self, from: data) {
                return obj.detail
            }
            if let obj = try? JSONDecoder().decode(ArrayDetail.self, from: data) {
                return obj.detail.first?.msg ?? "Validation error."
            }
            return "Something went wrong. Please try again."
        }

        private struct StringDetail: Decodable { let detail: String }
        private struct ArrayDetail: Decodable {
            let detail: [Item]
            struct Item: Decodable { let msg: String }
        }
    
}
