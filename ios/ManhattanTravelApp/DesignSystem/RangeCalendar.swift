//
//  RangeCalendar.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import SwiftUI

struct RangeCalendar: View {
    @Binding var start: Date?
    @Binding var end: Date?

    @State private var visibleMonth = Calendar.current.startOfDay(for: Date())
    private let cal = Calendar.current
    private let weekdays = ["S","M","T","W","T","F","S"]
    private let cols = Array(repeating: GridItem(.flexible(), spacing: 4), count: 7)

    var body: some View {
        VStack(spacing: 12) {
            header
            HStack(spacing: 4) {
                ForEach(weekdays.indices, id: \.self) { i in
                    Text(weekdays[i])
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(OffpeakTheme.textTertiary)
                        .frame(maxWidth: .infinity)
                }
            }
            LazyVGrid(columns: cols, spacing: 6) {
                ForEach(Array(days().enumerated()), id: \.offset) { _, day in
                    if let day { dayCell(day) }
                    else { Color.clear.frame(height: 40) }
                }
            }
        }
    }

    private var header: some View {
        HStack {
            Text(monthTitle).font(.system(size: 18, weight: .bold))
            Spacer()
            Button { shift(-1) } label: { Image(systemName: "chevron.left") }
            Button { shift(1)  } label: { Image(systemName: "chevron.right") }
                .padding(.leading, 8)
        }
        .foregroundColor(OffpeakTheme.ink)
    }

    private func dayCell(_ day: Date) -> some View {
        let selected = same(day, start) || same(day, end)
        let inRange = between(day)
        let disabled = day < cal.startOfDay(for: Date())
        return Text("\(cal.component(.day, from: day))")
            .font(.system(size: 15, weight: selected ? .bold : .regular))
            .foregroundColor(
                        selected ? .white
                        : disabled ? OffpeakTheme.textTertiary.opacity(0.35)   // ← 灰掉
                        : OffpeakTheme.ink
                    )
            .frame(maxWidth: .infinity, minHeight: 40)
            .background { if inRange { OffpeakTheme.accent.opacity(0.14) } }   // 中间连接带
            .background { if selected { Circle().fill(OffpeakTheme.accent).frame(width: 40, height: 40) } }
            .contentShape(Rectangle())
            .onTapGesture { if !disabled { select(day) } }
    }

    // MARK: logic
    private func select(_ day: Date) {
        guard day >= cal.startOfDay(for: Date()) else { return } 
        if start == nil || end != nil { start = day; end = nil }
        else if let s = start {
            if day < s { start = day; end = nil } else { end = day }
        }
    }
    private func same(_ a: Date, _ b: Date?) -> Bool { b.map { cal.isDate(a, inSameDayAs: $0) } ?? false }
    private func between(_ d: Date) -> Bool { guard let s = start, let e = end else { return false }; return d > s && d < e }
    private func shift(_ n: Int) { if let m = cal.date(byAdding: .month, value: n, to: visibleMonth) { visibleMonth = m } }
    private var monthTitle: String { let f = DateFormatter(); f.dateFormat = "MMMM yyyy"; return f.string(from: visibleMonth) }
    private func days() -> [Date?] {
        guard let first = cal.dateInterval(of: .month, for: visibleMonth)?.start else { return [] }
        let leading = cal.component(.weekday, from: first) - 1
        let count = cal.range(of: .day, in: .month, for: visibleMonth)?.count ?? 0
        return Array(repeating: nil, count: leading) + (0..<count).map { cal.date(byAdding: .day, value: $0, to: first) }
    }
}
