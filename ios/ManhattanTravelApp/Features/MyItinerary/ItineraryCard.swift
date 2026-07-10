//
//  ItineraryCard.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import SwiftUI

struct ItineraryCard: View {
    let itinerary: Itinerary

    var body: some View {
        HStack(spacing: 14) {
            CachedImage(url: itinerary.coverURL) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                OffpeakTheme.navy.opacity(0.08)
            }
            .frame(width: 84, height: 84)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            VStack(alignment: .leading, spacing: 6) {
                Text(itinerary.name)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(OffpeakTheme.ink)
                    .lineLimit(1)
                    .truncationMode(.tail)
                Text(itinerary.dateRangeText)
                    .font(.system(size: 14))
                    .foregroundColor(OffpeakTheme.textSecondary)
                HStack(spacing: 4) {
                    Image(systemName: "mappin").font(.system(size: 11))
                    Text(itinerary.placesText).font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(OffpeakTheme.textTertiary)
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(OffpeakTheme.navy.opacity(0.06), in: Capsule())
            }
            Spacer(minLength: 8)
        }
        .padding(16)
        .background {
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(.ultraThinMaterial)
                            .overlay(
                                RoundedRectangle(cornerRadius: 24, style: .continuous)
                                    .fill(Color.white.opacity(0.55))
                            )
                    }
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        //.shadow(color: Color(hex: 0x142850, alpha: 0.22), radius: 14, x: 0, y: 8)
        }
}

#if DEBUG
#Preview {
    ItineraryCard(itinerary: itineraryMock)
}
#endif
