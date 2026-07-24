//
//  POI.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//

import Foundation

struct FlexibleInt: Codable {
    let value: Int?

    init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let i = try? c.decode(Int.self) {
            value = i
        } else if let s = try? c.decode(String.self) {
            value = Int(s)
        } else {
            value = nil
        }
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(value)
    }
}

enum POICategory: String, CaseIterable, Identifiable {
    case all, museum, park, landmark, viewpoint, market, gallery
    
    var id: String { rawValue }
    
    var label: String {
        switch self {
        case .all:       return "All"
        case .museum:    return "Museums"
        case .park:      return "Parks"
        case .landmark:  return "Landmarks"
        case .viewpoint: return "Viewpoints"
        case .market:    return "Markets"
        case .gallery:   return "Galleries"
        }
    }
}


struct POI: Identifiable, Codable, POIImageRepresentable {
    var id: String { slug }

    let slug: String
        let name: String
        var type: String? = nil
        var neighborhood: String? = nil       // search filtering
        var summary: String? = nil            // tagline
        var heroImageUrl: String? = nil       // cover image
        var galleryImageUrls: [String]? = nil
        var googleReviewStar: Double? = nil   // rating
        var currentBusyness: FlexibleInt? = nil       // 0–100 busyness eyebrow
        var accessibilityLabels: [String]? = nil
        var admissionFee: Int? = nil          // priceLabel
        
    
        var categoryLabel: String? {
           guard let type, !type.isEmpty, type != "other" else { return nil }
           return type.prefix(1).uppercased() + type.dropFirst()
        }
    
    
        var priceLabel: String? {
            admissionFee.map { "$\($0)" }
        }
    
        var busyness: Busyness? {
            guard let p = currentBusyness?.value else { return nil }
            switch p {
            case ..<40:  return .quiet
            case ..<75:  return .moderate
            default:     return .busy
            }
        }
    
        var tagline: String? {
            guard let s = summary?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !s.isEmpty else { return nil }
            if let dot = s.range(of: ". ") { return String(s[..<dot.lowerBound]) }
            return s
        }
    
        var access: Access? {
            guard let labels = accessibilityLabels else { return nil }
            if labels.contains("wheelchair")         { return .full }
            if labels.contains("wheelchair_limited") { return .partial }
            return nil
        }
    
}

protocol POIImageRepresentable {
    var type: String? { get }
    var heroImageUrl: String? { get }
    var galleryImageUrls: [String]? { get }
}

extension POIImageRepresentable {
    
    var heroURL: URL? {
        if let s = heroImageUrl, let u = URL(string: s) { return u }
        if let s = galleryImageUrls?.first, let u = URL(string: s) { return u }
        return nil
    }
    
    var categoryIcon: String {
        switch type {
        case "museum", "gallery": return "building.columns"
        case "park":              return "leaf"
        case "viewpoint":         return "binoculars"
        case "market":            return "bag"
        case "neighborhood":      return "map"
        case "landmark":          return "building.2"
        default:                  return "mappin.and.ellipse"
        }
    }
    
}
