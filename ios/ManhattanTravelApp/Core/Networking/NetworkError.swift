//
//  NetworkError.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//


import Foundation

enum NetworkError: LocalizedError {
    case http(status: Int, detail: String)   // error response from endpoint（401/409/422…）
    case network                             // network
    case decoding                            // decoding
    case notFound//404
    case serverError//500

    var errorDescription: String? {
        switch self {
        case .http(_, let detail): return detail
        case .network: return "Can't reach the server. Check your connection."
        case .decoding: return "Unexpected response from server."
        case .notFound: return "Oops! We couldn't find that page."
        case .serverError: return "We're experiencing an unexpected server error."
        }
    }
}
