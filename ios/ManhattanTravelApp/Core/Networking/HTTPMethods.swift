//
//  HTTPMethods.swift
//  ManhattanTravelApp
//
//  Created by Sean on 05/07/2026.
//

enum HTTPMethod: String {
    case get = "GET", post = "POST", delete = "DELETE", put = "PUT", patch = "PATCH"
}

struct EmptyBody: Encodable {}
