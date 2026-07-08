//
//  APIClient.swift
//  ManhattanTravelApp
//
//  Created by Sean on 05/07/2026.
//

import Foundation

extension Notification.Name {
    static let authSessionExpired = Notification.Name("authSessionExpired")
}

actor APIClient {
    static let shared = APIClient()
    
    private let baseURL = APIConfig.baseURL
    private let session: URLSession = .shared
    private let authService = AuthService()
    private var refreshTask: Task<Void, Error>?
    
    //MARK: GET METHOD
    func get<Response: Decodable>(_ path: String, authenticated: Bool = false) async throws -> Response {
        try await decoded(path, method: .get, body: EmptyBody?.none, authenticated: authenticated)
    }
    
    //MARK: POST METHOD
    func post<Body: Encodable, Response: Decodable>(_ path: String, body: Body, authenticated: Bool = false) async throws -> Response {
            try await decoded(path, method: .post, body: body, authenticated: authenticated)
        }
    
    @discardableResult
        func post(_ path: String, authenticated: Bool = false) async throws -> Data {
            try await perform(path, method: .post, body: EmptyBody?.none, authenticated: authenticated)
        }

    @discardableResult
    func delete(_ path: String, authenticated: Bool = false) async throws -> Data {
        try await perform(path, method: .delete, body: EmptyBody?.none, authenticated: authenticated)
    }
    
    
    
    //MARK: DECODE
    private func decoded<Body: Encodable, Response: Decodable> (
        _ path: String,
        method: HTTPMethod,
        body: Body?,
        authenticated: Bool
    ) async throws -> Response {
        let data = try await perform(path, method: method, body: body, authenticated: authenticated)
        return try Self.decode(Response.self, from: data)
    }
    
    //MARK: PERFORM
    private func perform<Body: Encodable>(
        _ path: String,
        method: HTTPMethod,
        body: Body?,
        authenticated: Bool
    ) async throws -> Data {
        // make the http request & get response
        let (data, response) = try await raw(path, method: method, body: body, authenticated: authenticated)
        let http = try Self.asHTTP(response)
        // http status = 401 & authenticated
        if http.statusCode == 401, authenticated{
        // refresh the accessToken
            try await refreshIfNeeded()
        // retry
            let (retryData,retryReponse) = try await raw(path, method: method, body: body, authenticated: authenticated)
            let retryHttp = try Self.asHTTP(retryReponse)
            try Self.validate(retryHttp, data: retryData)
            return retryData
        }
        
        try Self.validate(http, data: data)
        return data
    }
    
    //MARK: RAW HTTP REQUEST
    private func raw<Body: Encodable>(
            _ path: String,
            method: HTTPMethod,
            body: Body?,
            authenticated: Bool
        ) async throws -> (Data, URLResponse) {
            var request = URLRequest(url: baseURL.appendingPathComponent(path))
            request.httpMethod = method.rawValue

            if let body {
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                request.httpBody = try Self.encode(body)
            }
            if authenticated {
                guard let token = TokenStore.accessToken else {
                    throw NetworkError.http(status: 401, detail: "Please log in first.")
                }
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }

            do {
                return try await session.data(for: request)
            } catch let e as URLError where e.code == .cancelled {
                throw CancellationError()
            } catch {
                throw NetworkError.network
            }
        }
    
    //MARK: REFRESH TOKEN
    private func refreshIfNeeded() async throws {
            if let existing = refreshTask { return try await existing.value }

            let task = Task<Void, Error> {
                guard let refreshToken = TokenStore.refreshToken else {
                    Self.expireSession()
                    throw NetworkError.http(status: 401, detail: "Please log in first.")
                }
                do {
                    let tokens = try await authService.refresh(RefreshRequest(refreshToken: refreshToken))
                    TokenStore.save(access: tokens.accessToken, refresh: tokens.refreshToken)
                } catch {
                    Self.expireSession()
                    throw error
                }
            }
            refreshTask = task
            defer { refreshTask = nil }
            try await task.value
        }
    
    private static func expireSession() {
            TokenStore.clear()
            NotificationCenter.default.post(name: .authSessionExpired, object: nil)
        }
    
    private static func encode<T: Encodable>(_ value: T) throws -> Data {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            do { return try encoder.encode(value) } catch { throw NetworkError.decoding }
        }

    private static func decode<T: Decodable>(_ type: T.Type, from data: Data) throws -> T {
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        do { return try decoder.decode(type, from: data) } catch { throw NetworkError.decoding }
    }

    private static func asHTTP(_ response: URLResponse) throws -> HTTPURLResponse {
        guard let http = response as? HTTPURLResponse else { throw NetworkError.decoding }
        return http
    }

    private static func validate(_ http: HTTPURLResponse, data: Data) throws {
        guard (200..<300).contains(http.statusCode) else {
            throw NetworkError.http(status: http.statusCode, detail: extractDetail(from: data))
        }
    }
    
    private static func extractDetail(from data: Data) -> String {
            if let obj = try? JSONDecoder().decode(StringDetail.self, from: data) { return obj.detail }
            if let obj = try? JSONDecoder().decode(ArrayDetail.self, from: data) {
                return obj.detail.first?.msg ?? "Validation error."
            }
            return "Something went wrong. Please try again."
        }
    private struct StringDetail: Decodable { let detail: String }
    
    private struct ArrayDetail: Decodable {
        let detail: [Item]; struct Item: Decodable { let msg: String }
    }


    
    
}


    

