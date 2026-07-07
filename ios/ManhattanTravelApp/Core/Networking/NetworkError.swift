//
//  NetworkError.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//


import Foundation

//enum NetworkError: LocalizedError {
//    case http(status: Int, detail: String)   // error response from endpoint（401/409/422…）
//    case network                             // network
//    case decoding                            // decoding
//    case notFound//404
//    case serverError//500
//    case unauthorized
//
//    var errorDescription: String? {
//        switch self {
//        case .http(_, let detail): return detail
//        case .network: return "Can't reach the server. Check your connection."
//        case .decoding: return "Unexpected response from server."
//        case .notFound: return "Oops! We couldn't find that page."
//        case .serverError: return "We're experiencing an unexpected server error."
//        case .unauthorized: return "Please log in first."
//        
//        }
//    }
//}


enum NetworkError: LocalizedError {
    case http(status: Int, detail: String)   // 所有非 2xx：401/404/409/422/500…
    case network                             // 连不上服务器 / 传输层错误
    case decoding                            // 响应不是预期结构

    var errorDescription: String? {
        switch self {
        case .http(let status, let detail):
            switch status {
            case 404:       return "Oops! We couldn't find that page."
            case 500...599: return "We're experiencing an unexpected server error."
            default:        return detail          // 401(密码错误/会话过期)、409、422… 用后端返回的 detail
            }
        case .network:  return "Can't reach the server. Check your connection."
        case .decoding: return "Unexpected response from server."
        }
    }
}
