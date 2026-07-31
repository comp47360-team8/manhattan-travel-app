//
//  SubwayBullet.swift
//  ManhattanTravelApp
//
//  Official NYC subway line bullets (colored circle + line symbol).
//  Colors from the MTA official palette.
//

import SwiftUI

struct SubwayBullet: View {
    let line: String

    var body: some View {
        Text(line.uppercased())
            .font(.system(size: 12, weight: .heavy))
            .foregroundColor(Self.textColor(for: line))
            .frame(width: 22, height: 22)
            .background(Self.color(for: line), in: Circle())
    }

    static func color(for line: String) -> Color {
        switch line.uppercased() {
        case "A", "C", "E":      return Color(hex: 0x0039A6)   // blue
        case "B", "D", "F", "M": return Color(hex: 0xFF6319)   // orange
        case "G":                return Color(hex: 0x6CBE45)   // light green
        case "L":                return Color(hex: 0xA7A9AC)   // light slate
        case "J", "Z":           return Color(hex: 0x996633)   // brown
        case "N", "Q", "R", "W": return Color(hex: 0xFCCC0A)   // yellow
        case "1", "2", "3":      return Color(hex: 0xEE352E)   // red
        case "4", "5", "6":      return Color(hex: 0x00933C)   // green
        case "7":                return Color(hex: 0xB933AD)   // purple
        case "T":                return Color(hex: 0x00ADD0)   // turquoise
        case "S":                return Color(hex: 0x808183)   // dark slate
        default:                 return Color(hex: 0x808183)
        }
    }

    static func textColor(for line: String) -> Color {
        switch line.uppercased() {
        case "N", "Q", "R", "W": return .black   // yellow lines use black glyphs
        default:                 return .white
        }
    }
}

/// Lays children left-to-right, wrapping to the next row when the next child
/// would overflow the available width. Used so a station with many subway
/// lines wraps instead of forcing the card wider than the screen.
struct FlowLayout: Layout {
    var spacing: CGFloat = 5

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let maxWidth = proposal.width ?? .infinity
        var x: CGFloat = 0, rowHeight: CGFloat = 0, totalHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {          // wrap to next row
                totalHeight += rowHeight + spacing
                x = 0; rowHeight = 0
            }
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
        return CGSize(width: maxWidth, height: totalHeight + rowHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowHeight: CGFloat = 0
        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX {   // wrap to next row
                x = bounds.minX; y += rowHeight + spacing; rowHeight = 0
            }
            view.place(at: CGPoint(x: x, y: y), anchor: .topLeading, proposal: ProposedViewSize(size))
            x += size.width + spacing
            rowHeight = max(rowHeight, size.height)
        }
    }
}

extension String {
    /// "South Ferry (1)/Whitehall St (R,W)" -> ["1", "R", "W"]
    var subwayLines: [String] {
        var result: [String] = []
        guard let regex = try? NSRegularExpression(pattern: "\\(([^)]+)\\)") else { return [] }
        let range = NSRange(startIndex..., in: self)
        for match in regex.matches(in: self, range: range) {
            if let r = Range(match.range(at: 1), in: self) {
                result += self[r].split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
            }
        }
        return result
    }

    /// "South Ferry (1)/Whitehall St (R,W)" -> "South Ferry/Whitehall St"
    var subwayStations: String {
        replacingOccurrences(of: "\\s*\\([^)]*\\)", with: "", options: .regularExpression)
            .trimmingCharacters(in: .whitespaces)
    }
}

#if DEBUG
#Preview {
    HStack(spacing: 6) {
        ForEach(["A", "1", "7", "R", "L", "G", "S"], id: \.self) { SubwayBullet(line: $0) }
    }
    .padding()
}
#endif
