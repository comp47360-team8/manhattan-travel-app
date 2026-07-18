//
//  GeneratedItinerary.swift
//  ManhattanTravelApp
//
//  DTOs for the itinerary generate / save endpoints and the mapping that
//  turns a backend `ItineraryResponse` into the UI's `OptimizedItinerary`.
//

import Foundation

// MARK: - Request

/// Body for `POST /api/itinerary/generate`.
/// Field names map to snake_case via the shared encoder's `.convertToSnakeCase`.
/// Note: `accessibilty` matches the backend's (misspelled) key intentionally.
struct GenerateItineraryRequest: Encodable {
    let tripName: String
    let tripDates: [String]        // ISO "yyyy-MM-dd" — [start, end]
    let pois: [String]             // POI slugs
    let accessibility: [String]    // accessibility labels to filter by, [] = no filter
}

// MARK: - Response (also re-sent verbatim to `POST /api/itinerary` to save)

/// Mirrors the backend `ItineraryResponse` (generate) and `ItinerarySavedResponse`
/// (saved-itinerary detail). Fields that only one of the two returns are optional
/// so a single type decodes both. Keys map from snake_case via the shared decoder.
struct APIItinerary: Codable {
    let itineraryId: String?       // saved detail only
    let tripName: String
    let startDate: String          // "yyyy-MM-dd"
    let endDate: String
    let warning: String?
    let accessibility: [String]?   // generate response only
    let stops: [APIStop]

    // Decodable is synthesized. Custom encode keeps `warning` / `accessibility`
    // always present when re-posting to POST /api/itinerary — that endpoint
    // treats them as required (nullable) and 422s if a key is missing.
    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(itineraryId, forKey: .itineraryId)
        try c.encode(tripName, forKey: .tripName)
        try c.encode(startDate, forKey: .startDate)
        try c.encode(endDate, forKey: .endDate)
        try c.encode(warning, forKey: .warning)               // null, never omitted
        try c.encode(accessibility ?? [], forKey: .accessibility)
        try c.encode(stops, forKey: .stops)
    }
}

struct APIStop: Codable {
    let stopId: String?            // saved detail only
    let poiId: Int
    let poiName: String
    let slug: String
    let dayNumber: Int             // 1-based day index
    let visitDate: String          // "yyyy-MM-dd"
    let slot: String               // "morning" | "afternoon" | "evening"
    let slotStart: String          // "HH:mm:ss"
    let slotEnd: String
    let position: Int
    let poiType: String
    let crowdLevel: String         // "Quiet" | "Moderate" | "Busy" | "Very Busy" | "Unavailable"
    let heroImageUrl: String
    let borough: String
    let neighborhood: String
    let suggestedDuration: Int     // minutes
    let accessibility: [String]?
    let flags: [String]
    let busynessForDay: [APIBusyness]
}

struct APIBusyness: Codable {
    let hourOfDay: Int
    let busyness: Int
}

/// Simple `{ "message": ... }` payload returned by save / unsave.
struct MessageResponse: Decodable {
    let message: String
}

// MARK: - Mapping to the UI model

extension DayPart {
    static func from(slot: String) -> DayPart {
        switch slot.lowercased() {
        case "morning":   return .morning
        case "afternoon": return .afternoon
        default:          return .evening
        }
    }
}

extension StopCrowd {
    static func from(level: String) -> StopCrowd {
        switch level.lowercased() {
        case "quiet":              return .low
        case "busy", "very busy":  return .high
        default:                   return .moderate   // "Moderate" / "Unavailable"
        }
    }
}

extension APIStop {
    /// 24 hourly busyness values (0–100) for the sparkline; missing hours are 0.
    var hourlyCurve: [Int] {
        var arr = Array(repeating: 0, count: 24)
        for b in busynessForDay where (0..<24).contains(b.hourOfDay) {
            arr[b.hourOfDay] = max(0, min(100, b.busyness))
        }
        return arr
    }

    var asStop: ItineraryStop {
        ItineraryStop(
            poi: POI(slug: slug,
                     name: poiName,
                     type: poiType,
                     neighborhood: neighborhood,
                     heroImageUrl: heroImageUrl,
                     accessibilityLabels: (accessibility?.isEmpty ?? true) ? nil : accessibility),
            part: DayPart.from(slot: slot),
            reason: "\(neighborhood) · \(suggestedDuration) min",
            crowd: StopCrowd.from(level: crowdLevel),
            hourly: hourlyCurve
        )
    }
}

extension OptimizedItinerary {
    /// Builds the swipeable day-by-day UI model from a backend itinerary,
    /// preserving the order the backend returns stops in.
    static func from(_ dto: APIItinerary, startDate: Date) -> OptimizedItinerary {
        let cal = Calendar.current
        var order: [Int] = []
        var buckets: [Int: [APIStop]] = [:]
        for stop in dto.stops {
            if buckets[stop.dayNumber] == nil {
                order.append(stop.dayNumber)
                buckets[stop.dayNumber] = []
            }
            buckets[stop.dayNumber]?.append(stop)
        }

        let days: [ItineraryDay] = order.enumerated().map { idx, key in
            let date = cal.date(byAdding: .day, value: idx, to: startDate) ?? startDate
            let stops = (buckets[key] ?? []).map(\.asStop)
            return ItineraryDay(index: idx + 1, date: date, stops: stops)
        }
        return OptimizedItinerary(name: dto.tripName, days: days)
    }
}
