//
//  BusynessLevel.swift
//  ManhattanTravelApp
//
//  Single source of truth for crowd/busyness levels across the app:
//  the Explore card, the POI detail forecast, and the itinerary stop card.
//  Thresholds and labels mirror the backend (quiet/moderate/busy/very_busy,
//  cut at 30/50/70) so every surface reads the same as the API.
//

import SwiftUI

enum BusynessLevel {
    case quiet, moderate, busy, veryBusy

    // MARK: - Construction (one set of rules, app-wide)

    /// Backend thresholds — used only where we have a raw 0–100 percentage and
    /// no label from the API (e.g. the forecast's hourly bars).
    static func from(pct: Int) -> BusynessLevel {
        switch pct {
        case ..<30: return .quiet
        case ..<50: return .moderate
        case ..<70: return .busy
        default:    return .veryBusy
        }
    }

    /// Preferred source: the backend's own level string. Returns nil for
    /// "Closed"/"Unavailable"/unknown so callers can hide the indicator.
    static func from(level: String?) -> BusynessLevel? {
        switch level?.lowercased() {
        case "quiet":                  return .quiet
        case "moderate":               return .moderate
        case "busy":                   return .busy
        case "very busy", "very_busy": return .veryBusy
        default:                       return nil   // closed / unavailable / nil
        }
    }

    // MARK: - Presentation

    var label: String {
        switch self {
        case .quiet:    return "Quiet"
        case .moderate: return "Moderate"
        case .busy:     return "Busy"
        case .veryBusy: return "Very busy"
        }
    }

    var dot: Color {
        switch self {
        case .quiet:    return OffpeakTheme.sage        // green
        case .moderate: return OffpeakTheme.amber       // yellow
        case .busy:     return Color(hex: 0xE8792E)     // orange
        case .veryBusy: return Color(hex: 0xC0392B)     // red
        }
    }

    var text: Color {
        switch self {
        case .quiet:    return Color(hex: 0x3D5E42)
        case .moderate: return Color(hex: 0x8A6A00)
        case .busy:     return Color(hex: 0xA85218)     // dark orange
        case .veryBusy: return Color(hex: 0x7A241C)     // dark red
        }
    }
}
