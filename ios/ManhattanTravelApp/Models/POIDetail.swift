//
//  POIDetail.swift
//  ManhattanTravelApp
//
//  Created by Sean on 29/06/2026.
//

import Foundation

struct POIDetail: Decodable, POIImageRepresentable {
    let slug: String
    let name: String
    var type: String? = nil
    var borough: String? = nil
    var neighborhood: String? = nil
    var summary: String? = nil
    var description: String? = nil
    var heroImageUrl: String? = nil
    var galleryImageUrls: [String]? = nil
    var googleReviewStar: Double? = nil
    var googleReviewCount: Int? = nil
    var bestTimeLabel: String? = nil
    var whyThisTime: String? = nil
    var openingHoursText: String? = nil
    var admissionFee: Int? = nil
    var admissionText: String? = nil
    var recommendedDurationMin: Int? = nil
    var closestSubway: String? = nil
    var accessibilityLabels: [String]? = nil
    var mapExternalUrl: String? = nil
    var websiteUrl: String? = nil

    
    var ratingText: String? {
        googleReviewStar.map { String(format: "%.1f", $0) }
    }
    var descriptionText: String? { (description?.isEmpty == false ? description : nil) ?? summary }
    
    var admissionDetail: String? {
        if let t = admissionText, !t.isEmpty { return t }
        if let f = admissionFee { return "$\(f)" }
        return nil       
    }
    
    var admissionShort: String? {
        if let f = admissionFee {
            return f == 0 ? "Free admission" : "$\(f)"
        }
        return nil                                         
    }

    
    var durationText: String? {
        guard let m = recommendedDurationMin else { return nil }
        if m < 60 { return "\(m) min" }
        if m % 60 == 0 { let h = m/60; return "\(h) hour\(h > 1 ? "s" : "")" }
        return String(format: "%.1f hours", Double(m) / 60)
    }
    var accessibilityItems: [AccessibilityItem] {
        (accessibilityLabels ?? []).compactMap { label in
            switch label {
            case "wheelchair":          return AccessibilityItem(icon: "figure.roll",      text: "Wheelchair accessible")
            case "wheelchair_limited":  return AccessibilityItem(icon: "figure.roll",      text: "Partial wheelchair access")
            case "accessible_restroom": return AccessibilityItem(icon: "checkmark.circle", text: "Accessible restrooms")
            case "step_free":           return AccessibilityItem(icon: "checkmark.circle", text: "Step-free entry")
            default:                    return nil
            }
        }
    }
    
    var openingHoursDisplay: String? {
        openingHoursText?
            .split(separator: ";")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .joined(separator: "\n")
    }
    
}

struct AccessibilityItem: Identifiable {
    let id = UUID()
    let icon: String
    let text: String
}
