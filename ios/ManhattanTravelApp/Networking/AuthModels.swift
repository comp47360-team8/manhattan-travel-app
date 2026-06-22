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
}
