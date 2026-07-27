//
//  InlineItineraryCard.swift
//  ManhattanTravelApp
//
//  Created by Sean on 21/07/2026.
//
import SwiftUI

enum SaveState { case idle, saving, saved }

struct InlineItineraryCard: View {
    let itinerary: OptimizedItinerary
    @State private var selectedDay = 0
    var onSave: () async -> Bool = { false }
    @State private var saveState: SaveState = .idle

    var body: some View {
        VStack{
            hero
            dayPillsRow
            sections
            saveButton
        }
        .background(Color.white.opacity(0.7))
        .clipShape(RoundedRectangle(cornerRadius: OffpeakTheme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: OffpeakTheme.cardRadius)
        .stroke(OffpeakTheme.cardBorder, lineWidth: 1))
        

    }
   


    private var hero: some View {
        ZStack(alignment: .bottomLeading) {
            
            LinearGradient(
                colors: [OffpeakTheme.navy, OffpeakTheme.brand],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

           
            Image(systemName: "sparkles")
                .font(.system(size: 90, weight: .bold))
                .foregroundColor(.white.opacity(0.10))
                .offset(x: 240, y: -40)

            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Image(systemName: "checkmark.seal.fill")
                    Text("YOUR ITINERARY · READY")
                }
                .font(.system(size: 11, weight: .heavy))
                .tracking(0.8)
                .foregroundColor(.white.opacity(0.9))

                Text(itinerary.name)
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                Text(subtitle)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(.white.opacity(0.85))
            }
            .padding(20)
        }
        .frame(height: 160)
        .clipped()
    }

    private var subtitle: String {
        let dayCount = itinerary.days.count
        let placeCount = itinerary.days.reduce(0) { $0 + $1.stops.count }
        let f = DateFormatter(); f.dateFormat = "MMM d"
        let ends = [itinerary.days.first?.date, itinerary.days.last?.date]
            .compactMap { $0 }.map { f.string(from: $0) }.joined(separator: " – ")
        return "\(ends) · \(dayCount) days · \(placeCount) places"
    }


    private func dayPill(_ idx: Int, _ day: ItineraryDay) -> some View {
        let isOn = idx == selectedDay
        return Button {
            withAnimation { selectedDay = idx }
        } label: {
            Text("Day \(day.index)")
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(isOn ? .white : OffpeakTheme.ink)
                .padding(.horizontal, 24).frame(height: 36)
                .background(isOn ? OffpeakTheme.brand : Color.black.opacity(0.05), in: Capsule())
        }
        .buttonStyle(.plain)
    }
    
    
    private var dayPillsRow: some View {
        ScrollView(.horizontal, showsIndicators: false){
            HStack(spacing: 10){
                ForEach(Array(itinerary.days.enumerated()), id: \.element.id){ idx, day in
                    dayPill(idx, day)
                }
            }
            
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
    }
    
    private var sections: some View {
        VStack(alignment: .leading, spacing: 20){
            let day = itinerary.days[selectedDay]
            ForEach(DayPart.allCases, id: \.self){ part in
                let stops = day.stops.filter {$0.part == part}
                if !stops.isEmpty {
                    HStack(spacing: 8) {
                        Text(part.title)
                            .font(.system(size: 12, weight: .bold)).tracking(0.8)
                            .foregroundColor(OffpeakTheme.textTertiary)
                        Text(part.window)
                            .font(.system(size: 12))
                            .foregroundColor(OffpeakTheme.textTertiary)
                    }

                    ForEach(stops){ stop in
                        StopCard(stop: stop)
                    }
                }
                    
            }
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 16)
    }
    
    private var saveButton: some View {
        Button {
            guard saveState == .idle else { return }
            Task {
                saveState = .saving
                let ok = await onSave()
                saveState = ok ? .saved : .idle
            }
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "bookmark.fill")
                Text(saveTitle)
            }
            .font(.system(size: 16, weight: .semibold))
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(saveState == .saved ? OffpeakTheme.sage : OffpeakTheme.brand, in: Capsule())
        }
        .disabled(saveState != .idle)
        .opacity(saveState == .saving ? 0.5 : 1)  
        .buttonStyle(.plain)
        .padding(.horizontal, 16)
        .padding(.top, 4)
        .padding(.bottom, 16)
    }
    
    private var saveTitle: String{
        switch saveState {
            case .idle:   return "Save itinerary"
            case .saving: return "Saving…"
            case .saved:  return "Saved"
            }
    }
    
}

#if DEBUG
#Preview {
    InlineItineraryCard(itinerary: .preview)
            .padding()
}
#endif
