//
//  OptimizedItineraryView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 06/07/2026.
//

import SwiftUI

/// The generated, crowd-optimised itinerary — one swipeable page per day.
struct OptimizedItineraryView: View {
    let itinerary: OptimizedItinerary
    var onBack: () -> Void = {}

    @State private var selectedDay = 0

    var body: some View {
        VStack(spacing: 0) {
            topBar
            daySelector
            swipeHint
            TabView(selection: $selectedDay) {
                ForEach(Array(itinerary.days.enumerated()), id: \.element.id) { idx, day in
                    dayPage(day).tag(idx)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .animation(.easeInOut, value: selectedDay)
        }
        .background(OffpeakTheme.backGround)
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
    }

    // MARK: Top bar

    private var topBar: some View {
        HStack(alignment: .top, spacing: 12) {
            Button { onBack() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
                    .frame(width: 40, height: 40).background(Color.white.opacity(0.6), in: Circle())
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(itinerary.name)
                    .font(.system(size: 18, weight: .bold)).foregroundColor(OffpeakTheme.ink)
                    .lineLimit(2)
                Text("Optimized for low crowds")
                    .font(.system(size: 12)).foregroundColor(OffpeakTheme.textSecondary)
            }
            Spacer()
            Button {
                // TODO: edit flow
            } label: {
                HStack(spacing: 5) {
                    Image(systemName: "pencil")
                    Text("Edit")
                }
                .font(.system(size: 13, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
                .padding(.horizontal, 14).frame(height: 34)
                .background(Color.white.opacity(0.7), in: Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 20).padding(.vertical, 10)
    }

    // MARK: Day selector

    private var daySelector: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(Array(itinerary.days.enumerated()), id: \.element.id) { idx, day in
                    dayPill(idx, day)
                }
            }
            .padding(.horizontal, 20)
        }
        .padding(.bottom, 6)
    }

    private func dayPill(_ idx: Int, _ day: ItineraryDay) -> some View {
        let selected = idx == selectedDay
        return Button {
            withAnimation { selectedDay = idx }
        } label: {
            Text("Day \(day.index) · \(day.shortDate)")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(selected ? .white : Color(hex: 0x3B4658))
                .padding(.horizontal, 16).frame(height: 34)
                .background(selected ? OffpeakTheme.navy : Color.white.opacity(0.7), in: Capsule())
        }
        .buttonStyle(.plain)
    }

    private var swipeHint: some View {
        HStack(spacing: 6) {
            Image(systemName: "chevron.left")
            Text("swipe between days")
            Image(systemName: "chevron.right")
        }
        .font(.system(size: 11, weight: .medium))
        .foregroundColor(OffpeakTheme.textTertiary)
        .frame(maxWidth: .infinity)
        .padding(.bottom, 6)
    }

    // MARK: Day page

    private func dayPage(_ day: ItineraryDay) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 22) {
                ForEach(DayPart.allCases, id: \.self) { part in
                    let stops = day.stops.filter { $0.part == part }
                    if !stops.isEmpty {
                        section(part, stops)
                    }
                }
                if day.stops.isEmpty {
                    Text("No stops planned for this day.")
                        .font(.system(size: 14)).foregroundColor(OffpeakTheme.textSecondary)
                        .frame(maxWidth: .infinity).padding(.top, 40)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 8)
            .padding(.bottom, 32)
        }
    }

    private func section(_ part: DayPart, _ stops: [ItineraryStop]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 8) {
                Text(part.title)
                    .font(.system(size: 12, weight: .bold)).tracking(0.8)
                    .foregroundColor(OffpeakTheme.textTertiary)
                Text(part.window)
                    .font(.system(size: 12))
                    .foregroundColor(OffpeakTheme.textTertiary)
            }
            ForEach(stops) { stop in
                StopCard(stop: stop)
            }
        }
    }
}

// MARK: - Stop card

private struct StopCard: View {
    let stop: ItineraryStop

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            thumbnail
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top, spacing: 8) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text(stop.poi.name)
                            .font(.system(size: 16, weight: .bold)).kerning(-0.3)
                            .foregroundColor(OffpeakTheme.navy)
                            .lineLimit(1)
                        Text(stop.reason)
                            .font(.system(size: 13))
                            .foregroundColor(OffpeakTheme.textSecondary)
                            .lineLimit(2)
                    }
                    Spacer(minLength: 0)
                    crowdBadge
                }
                BusynessSparkline(hourly: stop.hourly,
                                  tint: stop.crowd.dot,
                                  highlightHour: stop.part.centerHour)
            }
        }
        .padding(12)
        .background {
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(.ultraThinMaterial)
                .overlay(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(Color.white.opacity(0.7))
                )
        }
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: Color(hex: 0x142850, alpha: 0.14), radius: 10, y: 5)
    }

    private var thumbnail: some View {
        CachedImage(url: stop.poi.heroURL) { $0.resizable().scaledToFill() }
        placeholder: {
            ZStack {
                OffpeakTheme.navy.opacity(0.06)
                Image(systemName: stop.poi.categoryIcon)
                    .font(.system(size: 26, weight: .light))
                    .foregroundColor(OffpeakTheme.navy.opacity(0.3))
            }
        }
        .frame(width: 84, height: 84)
        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var crowdBadge: some View {
        HStack(spacing: 5) {
            Circle().fill(stop.crowd.dot).frame(width: 7, height: 7)
            Text(stop.crowd.badge)
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(stop.crowd.text)
        }
        .padding(.horizontal, 9).frame(height: 24)
        .background(stop.crowd.dot.opacity(0.16), in: Capsule())
    }
}

// MARK: - Busyness sparkline

/// A 24-bar mini chart of hourly busyness, highlighting the planned visit hour.
struct BusynessSparkline: View {
    let hourly: [Int]
    var tint: Color = OffpeakTheme.sage
    var highlightHour: Int? = nil

    var body: some View {
        VStack(spacing: 4) {
            HStack(alignment: .bottom, spacing: 2) {
                ForEach(Array(hourly.enumerated()), id: \.offset) { hour, value in
                    RoundedRectangle(cornerRadius: 1, style: .continuous)
                        .fill(hour == highlightHour ? tint : tint.opacity(0.3))
                        .frame(height: max(2, CGFloat(value) / 100 * 26))
                        .frame(maxWidth: .infinity)
                }
            }
            .frame(height: 26)

            HStack {
                Text("0H")
                Spacer()
                Text("12H")
                Spacer()
                Text("24H")
            }
            .font(.system(size: 8, weight: .medium))
            .foregroundColor(OffpeakTheme.textTertiary)
        }
    }
}

#if DEBUG
#Preview {
    NavigationStack {
        OptimizedItineraryView(itinerary: .preview)
    }
}
#endif
