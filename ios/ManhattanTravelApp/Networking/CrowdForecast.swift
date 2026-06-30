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
        case .quiet:    return OffpeakTheme.sage
        case .moderate: return OffpeakTheme.amber
        case .busy:     return OffpeakTheme.coral
        }
    }
}

struct HourBar: Identifiable {
    let id = UUID()
    let label: String     // "8a"
    let value: Double     // 0...1 柱高
    let level: CrowdLevel
}

enum ForecastDay: String, CaseIterable, Identifiable {
    case today = "Today", tomorrow = "Tomorrow", weekend = "Weekend"
    var id: String { rawValue }
}

/// TODO: 后端 forecast 接口好了之后替换掉
func mockForecast(for day: ForecastDay) -> [HourBar] {
    let hours = ["8a", "10a", "12p", "2p", "4p", "6p", "8p"]
    let base: [Double]
    switch day {
    case .today:    base = [0.30, 0.70, 0.62, 0.85, 1.00, 0.66, 0.34]
    case .tomorrow: base = [0.35, 0.60, 0.72, 0.78, 0.90, 0.55, 0.30]
    case .weekend:  base = [0.50, 0.80, 0.95, 1.00, 0.92, 0.70, 0.45]
    }
    return zip(hours, base).map { label, v in
        let level: CrowdLevel = v < 0.45 ? .quiet : (v < 0.8 ? .moderate : .busy)
        return HourBar(label: label, value: v, level: level)
    }
}
