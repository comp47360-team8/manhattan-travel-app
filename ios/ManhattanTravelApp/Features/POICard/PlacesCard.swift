//
//  PlacesCard.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//
import SwiftUI

enum Busyness {
    case quiet, moderate, busy

    var label: String {
        switch self {
        case .quiet:    return "Quiet"
        case .moderate: return "Moderate"
        case .busy:     return "Busy"
        }
    }
    var dot: Color {
        switch self {
        case .quiet:    return OffpeakTheme.sage
        case .moderate: return OffpeakTheme.amber
        case .busy:     return OffpeakTheme.coral
        }
    }
    var text: Color {
        switch self {
        case .quiet:    return Color(hex: 0x3D5E42)
        case .moderate: return Color(hex: 0x8A6A00)
        case .busy:     return Color(hex: 0xA23E36)
        }
    }
}

enum Access {
    case full
    case partial

    var label: String {
        switch self {
        case .full:    return "Step-free"
        case .partial: return "Partial access"
        }
    }
    var color: Color {
        switch self {
        case .full:    return Color(hex: 0x4A7652)
        case .partial: return Color(hex: 0x8A6A00)
        }
    }
    
    var labelFilter: String {
        switch self {
        case .full:    return "Full"
        case .partial: return "Limited"
        }
    }
}

struct PlaceCard: View {
    let poi: POI

    var isSaved: Bool = false
    var onToggleSave: () -> Void = {}
    
    var body: some View {
        VStack(alignment: .leading, spacing:  0) {
            hero
            body_
        }
        .background {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 24, style: .continuous)
                            .fill(Color.white.opacity(0.75))
                    )
            }
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .contentShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: Color(hex: 0x142850, alpha: 0.22), radius: 14, x: 0, y: 8)
        }

    private func accessPill(_ access: Access) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "figure.roll")
                .font(.system(size: 13, weight: .semibold))
            Text(access.label)
                .font(.system(size: 12, weight: .semibold))
        }
        .foregroundColor(access.color)
        .padding(.leading, 10)
        .padding(.trailing, 12)
        .frame(height: 30)
        .background(Color.white.opacity(0.8), in: Capsule())
        .shadow(color: Color(hex: 0x142850, alpha: 0.2), radius: 6, y: 3)
    }
    
    private var body_: some View {
            VStack(alignment: .leading, spacing: 0) {
                if let busyness = poi.busyness {
                    HStack(spacing: 7) {
                        Circle().fill(busyness.dot).frame(width: 8, height: 8)
                        Text(busyness.label)
                            .font(.system(size: 11, weight: .bold))
                            .tracking(1.3)
                            .textCase(.uppercase)
                            .foregroundColor(busyness.text)
                    }
                }

                Text(poi.name)
                    .font(.system(size: 20, weight: .bold))
                    .kerning(-0.5)
                    .lineSpacing(-2)
                    .foregroundColor(OffpeakTheme.navy)
                    .lineLimit(2)
                    .padding(.top, poi.busyness == nil ? 0 : 8)

                if let tagline = poi.tagline, !tagline.isEmpty {
                    Text(tagline)
                        .font(.system(size: 14.5).italic())
                        .foregroundColor(OffpeakTheme.textSecondary)
                        .lineLimit(2)
                        .padding(.top, 8)
                }

                metaRow.padding(.top, 14)
            }
            .padding(.horizontal, 18)
            .padding(.top, 16)
            .padding(.bottom, 18)
        }
    
    private var metaRow: some View {
           HStack(spacing: 7) {
               let hasLeft = poi.categoryLabel != nil || poi.priceLabel != nil
               if let category = poi.categoryLabel { metaText(category) }
               if poi.categoryLabel != nil && poi.priceLabel != nil { metaDot }
               if let priceLabel = poi.priceLabel { metaText(priceLabel) }
               if hasLeft && poi.googleReviewStar != nil { metaDot }
               if let star = poi.googleReviewStar {
                   HStack(spacing: 4) {
                       Image(systemName: "star.fill")
                           .font(.system(size: 12))
                           .foregroundColor(OffpeakTheme.amber)
                       Text(String(format: "%.1f", star))
                           .foregroundColor(OffpeakTheme.ink)
                   }
                   .font(.system(size: 14, weight: .semibold))
               }
           }
       }
    
    private func metaText(_ s: String) -> some View {
            Text(s)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(Color(hex: 0x3B4658))
        }
    
    private var metaDot: some View {
        Text("·").foregroundColor(Color(hex: 0xC2CAD6))
    }

    // When HeroURL is empty: error handling

    
    
    @ViewBuilder
    private var hero: some View {
        if let url = poi.heroURL {
            CachedImage(url: url){ image in
                photoHeader(image)
            } placeholder: {
                titleHeader
            }
        }else{
            titleHeader
        }
    }
        
    
    
    private func photoHeader(_ image: Image) -> some View {
        Color.clear
            .frame(height: 204)
            .frame(maxWidth: .infinity)
            .overlay(image.resizable().scaledToFill())
            .clipped()
            .overlay(alignment: .topTrailing){
                bookmarkButton.padding(12)
            }
            .overlay(alignment: .topLeading){
                if let access = poi.access {
                       accessPill(access).padding(18)
                   }
                    
            }
    }
    
    private var titleHeader: some View {
        Color.clear
            .frame(height: 150)
            .frame(maxWidth: .infinity)
            .overlay(alignment: .trailing) {
                Image(systemName: poi.categoryIcon)
                    .font(.system(size: 180, weight: .light))
                    .foregroundColor(OffpeakTheme.navy.opacity(0.08))
                    .offset(x: 40)
            }
            .clipped()
            .overlay(alignment: .topLeading) {
                if let access = poi.access { accessPill(access).padding(18) }
            }
            .overlay(alignment: .topTrailing) {
                bookmarkButton.padding(18)
            }
    }
    
    
    private var bookmarkButton: some View {
        Button { /* onToggleSave() */ } label: {
            Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(OffpeakTheme.navy)
                .frame(width: 38, height: 38)
                .background(Color.white.opacity(0.8), in: Circle())
                .shadow(color: Color(hex: 0x142850, alpha: 0.2), radius: 6, y: 3)
        }
    }
    
    
}


    
#Preview {
    let pois = mockUpData()
    
    if let poi = pois.first {
        ZStack {
            OffpeakTheme.sky.ignoresSafeArea()
            PlaceCard(poi: poi).padding(20)
        }
    }else{
        Text("Failed to load mock POI")
    }
}
