//
//  AuthService.swift
//  ManhattanTravelApp
//
//  Created by Sean on 22/06/2026.
//

import Foundation



struct AuthService {
    func signup(_ body: SignUpRequest)   async throws -> SignUpResponse { try await APIClient.shared.post("/api/auth/signup", body: body) }
    func login(_ body: LoginRequest)     async throws -> LoginResponse  { try await APIClient.shared.post("/api/auth/mobile/login", body: body) }
    func refresh(_ body: RefreshRequest) async throws -> RefreshResponse{ try await APIClient.shared.post("/api/auth/mobile/refresh", body: body) }
    @discardableResult
    func logout(_ body: LogoutRequest)   async throws -> LogoutResponse { try await APIClient.shared.post("/api/auth/mobile/logout", body: body) }
}
