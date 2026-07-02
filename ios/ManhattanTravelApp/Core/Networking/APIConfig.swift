//
//  APIConfig.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//
import Foundation


enum APIConfig {
    #if DEBUG
    static let baseURL = URL(string: "http://127.0.0.1:8000")!
    #else
    static let baseURL = URL(string: "https://your-prod-api.com")!
    #endif
}
