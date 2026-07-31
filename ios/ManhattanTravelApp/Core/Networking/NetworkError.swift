//
//  NetworkError.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//


import Foundation

enum NetworkError: LocalizedError {
    case http(status: Int, detail: String)   // Any non-2xx: 401/404/409/422/500…
    case network                             // Can't reach the server / transport-layer error
    case decoding                            // Response isn't the expected shape

    var errorDescription: String? {
        switch self {
        case .http(let status, let detail):
            switch status {
            case 404:       return "Oops! We couldn't find that page."
            case 500...599: return "We're experiencing an unexpected server error."
            default:        return detail
            }
        case .network:  return "Can't reach the server. Check your connection."
        case .decoding: return "Unexpected response from server."
        }
    }
}
