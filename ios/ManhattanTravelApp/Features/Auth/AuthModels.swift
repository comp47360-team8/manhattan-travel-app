//
//  AuthModels.swift
//  ManhattanTravelApp
//
//  Created by Sean on 22/06/2026.
//

import Foundation

// sign up request
struct SignUpRequest: Encodable {
    let email: String
    let displayName: String
    let password: String
    let confirmPassword: String
}

// login request

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

// sign up response
struct SignUpResponse: Decodable {
    let email: String
    let displayName: String
}


// login reponse
struct LoginResponse: Decodable {
    let accessToken: String
    let refreshToken: String
    let displayName: String
}

// logout request
struct LogoutRequest: Encodable {
    let refreshToken: String
}

// logout Response
struct LogoutResponse: Decodable {
    let message: String
}

// refresh 
struct RefreshRequest: Encodable {
    let refreshToken: String
}

// Refresh only needs the tokens. Decoupled from LoginResponse so a missing
// `display_name` in the refresh response can't fail decoding — which would drop
// the rotated tokens and eventually log the user out.
struct RefreshResponse: Decodable {
    let accessToken: String
    let refreshToken: String
}
