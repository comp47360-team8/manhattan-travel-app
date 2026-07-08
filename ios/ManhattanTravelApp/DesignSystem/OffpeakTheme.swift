//
//  OffpeakTheme.swift
//  ManhattanTravelApp
//
//  Sky theme — cool, airy daylight palette (navy on sky-blue).
//  Imported from the Claude Design "Offpeak Themes" doc (THEME 01 · Sky).
//

import SwiftUI

enum OffpeakTheme {
    // MARK: Core palette
    static let sky   = Color(hex: 0xEAF1FB)   // page background
    static let navy  = Color(hex: 0x1A3A52)   // primary / brand accent
    static let ink   = Color(hex: 0x0B0D12)   // primary text
    static let sage  = Color(hex: 0xA2B7A5)   // calm / quiet indicator
    static let amber = Color(hex: 0xF5B301)   // ratings / moderate
    static let coral = Color(hex: 0xD4544A)   // busy / crowded
    static let accent = Color(hex: 0x734B37)

    // MARK: Text shades
    static let textSecondary = Color(hex: 0x5B6578)
    static let textTertiary  = Color(hex: 0x7B8493)
    static let badgeText     = Color(hex: 0x3D5E42)  // "Quiet before 11am"

    // MARK: Frosted-glass surfaces
    static let card        = Color.white.opacity(0.85)
    static let searchField = Color.white.opacity(0.55)
    static let cardBorder  = Color.white.opacity(0.6)

    // layered over the background.
    static let backgroundGradient = LinearGradient(
        colors: [
            Color(hex: 0xD6E3D1),
            Color(hex: 0xD8D8C9),
            Color(hex: 0xDDD0C8),
            Color(hex: 0xE8D4C7),
            Color(hex: 0xF0E2C8),
            Color(hex: 0xF3E9D4),
            Color(hex: 0xE8DDD8)
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    
    
    // MARK: Shape
    static let cardRadius: CGFloat = 22

    static let cardShadowColor  = Color(hex: 0x142850).opacity(0.22)
    static let cardShadowRadius: CGFloat = 14
    static let cardShadowY: CGFloat = 8
    
    static var backGround: some View {
        ZStack {
            sky
            backgroundGradient
        }
        .ignoresSafeArea()
    }
}

extension Color {
    /// Build a color from a 0xRRGGBB literal.
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255,
            opacity: alpha
        )
    }
}
