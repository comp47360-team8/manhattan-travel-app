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
    let accessibilty: [String]     // accessibility labels to filter by, [] = no filter
}

// MARK: - Response (also re-sent verbatim to `POST /api/itinerary` to save)

struct APIItinerary: Codable {
    let itineraryId: String
    let tripName: String
    let tripDates: String
    let stops: [APIStop]
}

struct APIStop: Codable {
    let poiName: String
    let slug: String
    let dayNumber: String          // "Day 1"
    let dates: String              // "Thursday, 12 Jun"
    let slot: String               // "morning" | "afternoon" | "evening"
    let slotTimes: String
    let poiType: String
    let crowdLevel: String         // "Quiet" | "Moderate" | "Busy" | "Very Busy" | "Unavailable"
    let heroImageUrl: String
    let borough: String
    let neighborhood: String
    let suggestedDuration: String
    let accessibility: [String]
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
                     accessibilityLabels: accessibility.isEmpty ? nil : accessibility),
            part: DayPart.from(slot: slot),
            reason: "\(neighborhood) · \(suggestedDuration)",
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
        var order: [String] = []
        var buckets: [String: [APIStop]] = [:]
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
