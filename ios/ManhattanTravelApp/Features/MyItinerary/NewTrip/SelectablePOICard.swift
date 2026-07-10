//
//  SelectablePOICard.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import SwiftUI

struct SelectablePOICard: View {
    let poi: POI
    let isSelected: Bool
    /// When true the card stretches to fill its container (grid cell);
    /// otherwise it keeps the fixed 110pt width used in horizontal rows.
    var fillWidth: Bool = false

    var body: some View {
        CachedImage(url: poi.heroURL) {$0.resizable().scaledToFill() }
        placeholder: {
            Image(systemName: poi.categoryIcon)
                .font(.system(size: 100, weight: .light))
                .foregroundColor(OffpeakTheme.navy.opacity(0.08))
                .offset(x: -20, y: -30)
        }
        .frame(width: fillWidth ? nil : 110, height: 130)
        .frame(maxWidth: fillWidth ? .infinity : nil)
        .clipped()
        .background(
            LinearGradient(
                colors: [Color(hex: 0xEDE6DB),
                         Color(hex: 0xCFC5B7)],
                startPoint: .top, endPoint: .bottom).opacity(0.9)
        )
        .overlay(
            LinearGradient(colors: [.clear, .black.opacity(0.75)], startPoint: .center, endPoint: .bottom)
        )
        .overlay(alignment: .topTrailing) {
            if let access = poi.access {
                accessPill(access)
                    .padding(8)
            }
        }
        .overlay(alignment: .bottomLeading) {
            VStack(alignment: .leading, spacing: 1) {
                Text(poi.name).font(.system(size: 13, weight: .bold)).foregroundColor(.white).lineLimit(1)
                if let n = poi.neighborhood {
                    Text(n).font(.system(size: 11)).foregroundColor(.white.opacity(0.85)).lineLimit(1)
                }
            }
            .padding(8)
        }
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(isSelected ? OffpeakTheme.accent : .clear, lineWidth: 3)
        )
    }
    
    
    private func accessPill(_ access: Access) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "figure.roll")
                .font(.system(size: 13, weight: .semibold))
        }
        .foregroundColor(access.color)
        .padding(.leading, 10)
        .padding(.trailing, 12)
        .frame(height: 30)
        .background(Color.white.opacity(0.8), in: Capsule())
        .shadow(color: Color(hex: 0x142850, alpha: 0.2), radius: 6, y: 3)
    }
}

#if DEBUG
#Preview {
    if let poi = mockUpData().first {
        HStack(spacing: 12) {
            SelectablePOICard(poi: poi, isSelected: false)
            SelectablePOICard(poi: poi, isSelected: true)
        }
        .padding()
        .background(OffpeakTheme.backGround)
    } else {
        Text("No mock POI data")
    }
}
#endif
