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
        var currentBusyness: String? = nil
        var currentBusynessPct: Int? = nil
        var accessibilityLabels: [String]? = nil
        var admissionFee: Int? = nil          // priceLabel
        
    
        var categoryLabel: String? {
           guard let type, !type.isEmpty, type != "other" else { return nil }
           return type.prefix(1).uppercased() + type.dropFirst()
        }
    
    
        var priceLabel: String? {
            admissionFee.map { "$\($0)" }
        }
    
        // Classify from the raw percentage (same path as the forecast chart:
        // BusynessLevel.from(pct:)) so the card and the detail forecast always
        // agree. We deliberately ignore the backend's `current_busyness` level
        // string — its DB `level` column uses different cut points (~25/50/75)
        // and disagrees at the boundaries (e.g. pct 70 reads "busy" there but
        // "very busy" here). A missing or 0 pct means no data / closed → hide.
        var busyness: BusynessLevel? {
            guard let pct = currentBusynessPct, pct > 0 else { return nil }
            return BusynessLevel.from(pct: pct)
        }
    
    // return the first sentence with first dot (ignore abbrevation)
    var tagline: String? {
        guard let s = summary?.trimmingCharacters(in: .whitespacesAndNewlines),
              !s.isEmpty else { return nil }

        let abbreviations: Set<String> = ["St", "Mt", "Ave", "Rd", "Dr", "No", "Ft", "Blvd", "Sq", "Jr", "Sr"]

        var searchStart = s.startIndex
        while let dot = s.range(of: ". ", range: searchStart..<s.endIndex) {
            let before = s[..<dot.lowerBound]
            let lastWord = before.split(separator: " ").last.map(String.init) ?? ""
            if !abbreviations.contains(lastWord) {
                return String(s[..<dot.lowerBound])
            }
            searchStart = dot.upperBound
        }
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
