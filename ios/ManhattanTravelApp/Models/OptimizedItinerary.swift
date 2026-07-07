//
//  OptimizedItinerary.swift
//  ManhattanTravelApp
//
//  Created by Sean on 06/07/2026.
//

import SwiftUI

/// Crowd forecast level shown on each optimized stop.
enum StopCrowd {
    case low, moderate, high

    var badge: String {
        switch self {
        case .low:      return "Low"
        case .moderate: return "Mod"
        case .high:     return "High"
        }
    }
    var dot: Color {
        switch self {
        case .low:      return OffpeakTheme.sage
        case .moderate: return OffpeakTheme.amber
        case .high:     return OffpeakTheme.coral
        }
    }
    var text: Color {
        switch self {
        case .low:      return Color(hex: 0x3D5E42)
        case .moderate: return Color(hex: 0x8A6A00)
        case .high:     return Color(hex: 0xA23E36)
        }
    }

    static func from(busyness value: Int) -> StopCrowd {
        switch value {
        case ..<40: return .low
        case ..<75: return .moderate
        default:    return .high
        }
    }
}

/// Time-of-day bucket a stop is scheduled in.
enum DayPart: Int, CaseIterable, Hashable {
    case morning, afternoon, evening

    var title: String {
        switch self {
        case .morning:   return "MORNING"
        case .afternoon: return "AFTERNOON"
        case .evening:   return "EVENING"
        }
    }
    var window: String {
        switch self {
        case .morning:   return "09:00 – 12:00"
        case .afternoon: return "13:00 – 17:00"
        case .evening:   return "18:00 – 21:00"
        }
    }
    /// Hour the visit centres on — used to sample the busyness curve.
    var centerHour: Int {
        switch self {
        case .morning:   return 10
        case .afternoon: return 15
        case .evening:   return 19
        }
    }
}

struct ItineraryStop: Identifiable {
    let id = UUID()
    let poi: POI
    let part: DayPart
    let reason: String
    let crowd: StopCrowd
    /// 24 hourly busyness values (0–100) driving the sparkline.
    let hourly: [Int]
}

struct ItineraryDay: Identifiable {
    let id = UUID()
    let index: Int          // 1-based day number
    let date: Date
    let stops: [ItineraryStop]

    var shortDate: String {
        let f = DateFormatter(); f.dateFormat = "MMM d"
        return f.string(from: date)
    }
}

struct OptimizedItinerary: Identifiable {
    let id = UUID()
    let name: String
    let days: [ItineraryDay]
}

// MARK: - Mock optimiser

extension OptimizedItinerary {
    /// Client-side stand-in for the AI optimiser: spreads the chosen places
    /// evenly across the trip days and slots each into a calm time window.
    /// TODO: replace with the backend `/api/itineraries/optimize` response.
    static func build(name: String, startDate: Date, dayCount: Int, pois: [POI]) -> OptimizedItinerary {
        let days = max(dayCount, 1)
        var buckets: [[POI]] = Array(repeating: [], count: days)
        for (i, poi) in pois.enumerated() { buckets[i % days].append(poi) }

        let cal = Calendar.current
        let reasonsCalm = ["Quietest hour before tour groups", "Lowest wait of the day",
                           "Afternoon shade, low crowds", "Calm window before the rush"]
        let reasonsBusy = ["Right after lunch rush", "Busier — go early in the window",
                           "Steady flow, still manageable"]

        let itineraryDays: [ItineraryDay] = buckets.enumerated().map { dayIdx, dayPois in
            let date = cal.date(byAdding: .day, value: dayIdx, to: startDate) ?? startDate
            let stops: [ItineraryStop] = dayPois.enumerated().map { i, poi in
                let part = DayPart.allCases[i % DayPart.allCases.count]
                let hourly = busynessCurve(for: poi)
                let level = StopCrowd.from(busyness: hourly[part.centerHour])
                let reason = level == .low
                    ? reasonsCalm[i % reasonsCalm.count]
                    : reasonsBusy[i % reasonsBusy.count]
                return ItineraryStop(poi: poi, part: part, reason: reason, crowd: level, hourly: hourly)
            }
            return ItineraryDay(index: dayIdx + 1, date: date, stops: stops)
        }
        return OptimizedItinerary(name: name, days: itineraryDays)
    }

    /// Typical daily crowd shape (0–1 per hour) — calm early/late, peaking mid-afternoon.
    private static let hourShape: [Double] = [
        0.08, 0.06, 0.05, 0.05, 0.06, 0.08, 0.12, 0.18, 0.28, 0.38, 0.45, 0.55,
        0.68, 0.80, 0.88, 0.85, 0.75, 0.62, 0.50, 0.40, 0.32, 0.24, 0.16, 0.10
    ]

    private static func busynessCurve(for poi: POI) -> [Int] {
        let base = Double(poi.currentBusyness?.value ?? 55)
        let intensity = 0.6 + 0.4 * (base / 100)
        return hourShape.map { shape in
            min(100, max(4, Int((shape * intensity * 100).rounded())))
        }
    }
}

#if DEBUG
extension OptimizedItinerary {
    static var preview: OptimizedItinerary {
        let pois = [
            POI(slug: "central-park",    name: "Central Park (East)", type: "park",     neighborhood: "Midtown"),
            POI(slug: "the-met",         name: "The Met",             type: "museum",   neighborhood: "Upper East Side"),
            POI(slug: "chelsea-market",  name: "Chelsea Market",      type: "market",   neighborhood: "Chelsea"),
            POI(slug: "the-high-line",   name: "The High Line",       type: "park",     neighborhood: "Chelsea"),
            POI(slug: "moma",            name: "MoMA",                type: "museum",   neighborhood: "Midtown"),
            POI(slug: "brooklyn-bridge", name: "Brooklyn Bridge",     type: "landmark", neighborhood: "Lower Manhattan")
        ]
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        return build(name: "Long Weekend in NYC",
                     startDate: f.date(from: "2026-06-12") ?? .now,
                     dayCount: 3, pois: pois)
    }
}
#endif
