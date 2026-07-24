//
//  CrowdForecast.swift
//  ManhattanTravelApp
//
//  Created by Sean on 30/06/2026.
//

import SwiftUI

enum CrowdLevel {
    case quiet, moderate, busy
    var color: Color {
        switch self {
        case .quiet:    return Color(hex: 0x5FA766)
        case .moderate: return OffpeakTheme.amber
        case .busy:     return OffpeakTheme.coral
        }
    }
    var label: String {
        switch self {
            case .quiet:    return "Quiet"
            case .moderate: return "Moderate"
            case .busy:     return "Busy"
        }
    }
}

struct HourBar: Identifiable {
    let id = UUID()
    let hour: Int
    let label: String
    let value: Double
    let level: CrowdLevel
    let hasData: Bool
}

enum ForecastDay: String, CaseIterable, Identifiable {
    case today = "Today", tomorrow = "Tomorrow", weekend = "Weekend"
    var id: String { rawValue }
}



struct POIBusynessResponse: Decodable {
    let today: [HourlyBusyness]
    let tomorrow: [HourlyBusyness]
    let weekend: [HourlyBusyness]
}


struct HourlyBusyness: Decodable {
    let hourOfDay: Int
    let busyness: Double
}


extension POIBusynessResponse {
    
    func bars(for day: ForecastDay) -> [HourBar] {
        let source: [HourlyBusyness]
        switch day {
            case .today: source = today
            case .tomorrow: source = tomorrow
            case .weekend: source = weekend
        }
        
        let byHour = Dictionary(source.map { ($0.hourOfDay, $0.busyness) },
                                uniquingKeysWith: { a, _ in a })

        func hourLabel(_ h: Int) -> String {
            let period = h < 12 ? "a" : "p"
            let twelve = h % 12 == 0 ? 12 : h % 12
            return "\(twelve)\(period)"
        }

        return (0..<24).map { hour in
            if let busyness = byHour[hour] {
                let value = busyness / 100
                let level: CrowdLevel = value < 0.45 ? .quiet : (value < 0.8 ? .moderate : .busy)
                return HourBar(hour: hour, label: hourLabel(hour), value: value, level: level, hasData: true)
            } else {
                return HourBar(hour: hour, label: hourLabel(hour), value: 0, level: .quiet, hasData: false)
            }
        }
    }
    
    
}
