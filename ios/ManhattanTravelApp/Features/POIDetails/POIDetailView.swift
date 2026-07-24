//
//  POIDetailView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 30/06/2026.
//

import SwiftUI

struct POIDetailView: View {

    let slug: String
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var savedStore: SavedPOIStore
    @StateObject private var vm = POIDetailViewModel()
    
    @State private var day: ForecastDay = .today
    @Environment(\.dismiss) private var dismiss
    
    var isSaved: Bool
    
    var body: some View {
        ScrollView {
            if let poi = vm.poi {
                content(poi)
            } else if vm.isLoading {
                ProgressView()
                    .tint(OffpeakTheme.navy)
                    .padding(.top, 120)
                    .frame(maxWidth: .infinity, alignment: .center)
            } else if let err = vm.errorMessage {
                    Text(err)
                        .foregroundColor(OffpeakTheme.textSecondary)
                        .padding(.top, 120)
                        .frame(maxWidth: .infinity, alignment: .center)
            }
        }
        .background(OffpeakTheme.backGround)
        .ignoresSafeArea(edges: .top)
        .overlay(alignment: .topLeading)  { circleButton("chevron.left") { dismiss() }.padding(.leading, 16).padding(.top, 8) }
        .overlay(alignment: .topTrailing) {
            circleButton( isSaved ? "bookmark.fill" : "bookmark") {
            handleToggleSave(slug)
        }.padding(.trailing, 16).padding(.top, 8) }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task {
            await vm.load(slug: slug)
            if authManager.isLoggedIn { await savedStore.load()}
        }
    }

    // MARK: Sections
    private func content(_ poi: POIDetail) -> some View {
        VStack(spacing: 0) {
            hero(poi)
            VStack(alignment: .leading, spacing: 24) {
                titleBlock(poi)
                if let desc = poi.descriptionText {
                    Divider()
                    ExpandableText(text: desc)
                }
                if let label = poi.bestTimeLabel { recommendedTime(label, why: poi.whyThisTime) }
                crowdForecast
                detailsCard(poi)
                accessibility(poi)
            }
            .padding(20)
        }
    }

    private func hero(_ poi: POIDetail) -> some View {
        Color.clear
                .frame(height: 300)
                .frame(maxWidth: .infinity)
                .overlay {
                    CachedImage(url: poi.heroURL) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        heroPlaceholder(poi)
                    }
                }
                .clipped()
                .overlay(alignment: .bottomTrailing) {
                    if let level = currentLevel {
                        busynessBadge(level)
                    }
                }
        
    }

    private func titleBlock(_ poi: POIDetail) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 8) {
                Text(poi.name)
                    .font(.system(size: 30, weight: .bold))
                    .kerning(-0.5)
                    .foregroundColor(OffpeakTheme.ink)

                Spacer(minLength: 8)

                if let url = poi.mapExternalUrl, let u = URL(string: url) {
                    Link(destination: u) {
                        HStack(spacing: 3) {
                            Text("View on map")
                            Image(systemName: "arrow.up.right")
                        }
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(OffpeakTheme.navy)
                    }
                    .fixedSize()
                }
            }

            HStack(spacing: 8) {
                if let hood = poi.neighborhood { Text(hood) }
                if let star = poi.ratingText {
                    Text("·").foregroundColor(Color(hex: 0xC2CAD6))
                    HStack(spacing: 3) {
                        Image(systemName: "star.fill").foregroundColor(OffpeakTheme.amber)
                        Text(star).foregroundColor(OffpeakTheme.ink)
                    }
                }
                if let admission = poi.admissionShort {
                    Text("·").foregroundColor(Color(hex: 0xC2CAD6))
                    Text(admission).foregroundColor(Color(hex: 0x3D5E42))
                }
            }
            .font(.system(size: 14, weight: .medium))
            .foregroundColor(OffpeakTheme.textSecondary)
        }
    }

    private func recommendedTime(_ label: String, why: String?) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 6) {
                Image(systemName: "clock")
                Text("RECOMMENDED TIME").tracking(0.8)
            }
            .font(.system(size: 11, weight: .bold))
            .foregroundColor(Color(hex: 0x3D5E42))

            Text(label).font(.system(size: 18, weight: .bold)).foregroundColor(OffpeakTheme.ink)

            if let why { Text(why).font(.system(size: 13).italic()).foregroundColor(OffpeakTheme.textSecondary).lineSpacing(2) }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(OffpeakTheme.sage.opacity(0.14), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var crowdForecast: some View {
        let bars = vm.forecast?.bars(for: day) ?? []

        return VStack(alignment: .leading, spacing: 12) {
          
            Text("Crowd forecast")
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(OffpeakTheme.ink)

           
            VStack(alignment: .leading, spacing: 14) {
                
                HStack(spacing: 0) {
                    ForEach(ForecastDay.allCases) { d in
                        let on = d == day
                        Text(d.rawValue)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(on ? OffpeakTheme.ink : OffpeakTheme.textTertiary)
                            .frame(maxWidth: .infinity).frame(height: 34)
                            .background(on ? Color.white : Color.clear, in: Capsule())
                            .onTapGesture { day = d }
                    }
                }
                .padding(4)
                .background(OffpeakTheme.navy.opacity(0.06), in: Capsule())


                chart(bars, highlightHour: day == .today ? manhattanHour : nil) 

                Divider()

                HStack(spacing: 16) {
                    legend(.quiet, "Quiet"); legend(.moderate, "Moderate"); legend(.busy, "Busy")
                    Spacer()
                    if day == .today {
                        HStack(spacing: 5) {
                            Circle().fill(OffpeakTheme.brand).frame(width: 8, height: 8)
                            Text("Now").font(.system(size: 12, weight: .semibold)).foregroundColor(OffpeakTheme.brand)
                        }
                    }
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))

            Text("Based on historical patterns + ML prediction")
                .font(.system(size: 11))
                .foregroundColor(OffpeakTheme.textTertiary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        
    }


    @ViewBuilder
    private func chart(_ bars: [HourBar], highlightHour: Int?) -> some View {
        if bars.allSatisfy({ !$0.hasData }) {
            VStack(spacing: 10) {
                Image(systemName: "chart.bar.xaxis")
                    .font(.system(size: 26, weight: .light))
                    .foregroundColor(OffpeakTheme.textTertiary)
                Text("No crowd forecast for this spot yet")
                    .font(.system(size: 13))
                    .foregroundColor(OffpeakTheme.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 150)
        } else {
            VStack(spacing: 10) {
                HStack(alignment: .bottom, spacing: 7) {
                    ForEach(bars) { bar in
                        let isNow = bar.hour == highlightHour
                        ZStack(alignment: .bottom) {
                            Capsule().fill(isNow ? OffpeakTheme.brand.opacity(0.20) : OffpeakTheme.navy.opacity(0.06))
                            if bar.hasData {
                                Capsule().fill(bar.level.color)
                                    .frame(height: max(6, 120 * bar.value))
                            }
                        }
                        .frame(maxWidth: 18, maxHeight: .infinity)
                        .frame(maxWidth: .infinity)
                    }
                }
                .frame(height: 120)
                HStack(spacing: 7) {
                    ForEach(Array(bars.enumerated()), id: \.element.id) { index, bar in
                        Text(index % 3 == 0 ? "\(bar.hour)" : "")
                            .font(.system(size: 10, weight: .medium))
                            .fixedSize()
                            .foregroundColor(OffpeakTheme.textTertiary)
                            .frame(maxWidth: .infinity)
                        
                    }
                }
            }
        }
    }

    private func legend(_ level: CrowdLevel, _ text: String) -> some View {
        HStack(spacing: 5) {
            Circle().fill(level.color).frame(width: 8, height: 8)
            Text(text).font(.system(size: 12)).foregroundColor(OffpeakTheme.textSecondary)
        }
    }

    private func detailsCard(_ poi: POIDetail) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Details").font(.system(size: 18, weight: .bold)).foregroundColor(OffpeakTheme.ink)
            VStack(spacing: 0) {
                detailRow("clock", "OPEN HOURS", poi.openingHoursDisplay)
                detailRow("dollarsign", "ADMISSION", poi.admissionDetail)
                detailRow("hourglass", "RECOMMENDED DURATION", poi.durationText)
                subwayRow(poi)
            }
            .padding(16)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        }
    }

    @ViewBuilder
    private func detailRow(_ icon: String, _ title: String, _ value: String?, divider: Bool = true) -> some View {
        if let value {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: icon).font(.system(size: 16)).foregroundColor(OffpeakTheme.navy).frame(width: 22)
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.system(size: 10, weight: .bold)).tracking(0.6).foregroundColor(OffpeakTheme.textTertiary)
                    Text(value).font(.system(size: 15, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
                }
                Spacer()
            }
            .padding(.vertical, 10)
            if divider { Rectangle().fill(Color(hex: 0x142850, alpha: 0.07)).frame(height: 0.5) }
        }
    }

    @ViewBuilder
    private func subwayRow(_ poi: POIDetail) -> some View {
        if let subway = poi.closestSubway {
            let lines = subway.subwayLines
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: "tram.fill").font(.system(size: 16)).foregroundColor(OffpeakTheme.navy).frame(width: 22)
                VStack(alignment: .leading, spacing: 6) {
                    Text("CLOSEST SUBWAY").font(.system(size: 10, weight: .bold)).tracking(0.6).foregroundColor(OffpeakTheme.textTertiary)
                    if !lines.isEmpty {
                        HStack(spacing: 5) {
                            ForEach(lines, id: \.self) { SubwayBullet(line: $0) }
                        }
                    }
                    Text(subway.subwayStations).font(.system(size: 15, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
                }
                Spacer()
            }
            .padding(.vertical, 10)
        }
    }

    @ViewBuilder
    private func accessibility(_ poi: POIDetail) -> some View {
        if !poi.accessibilityItems.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
                Text("Accessibility")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(OffpeakTheme.ink)
                VStack(alignment: .leading, spacing: 14) {
                    ForEach(poi.accessibilityItems) { item in
                        HStack(spacing: 12) {
                            Image(systemName: item.icon)
                                .font(.system(size: 16))
                                .foregroundColor(Color(hex: 0x3D5E42))
                                .frame(width: 22)
                            Text(item.text)
                                .font(.system(size: 15))
                                .foregroundColor(OffpeakTheme.ink)
                        }
                    }
                }
                .padding(16)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
        }
    }

    private func circleButton(_ icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(OffpeakTheme.navy)
                .frame(width: 40, height: 40)
                .background(.ultraThinMaterial, in: Circle())
        }
    }
    
    private func handleToggleSave(_ slug: String) {
           guard authManager.isLoggedIn else {
               authManager.requireLogin()
               return
           }
           Task { await savedStore.toggle(slug: slug) }
       }
    
    private func heroPlaceholder(_ poi: POIDetail) -> some View {
        OffpeakTheme.navy.opacity(0.06)
            .overlay(
                Image(systemName: poi.categoryIcon)
                    .font(.system(size: 300, weight: .light))
                    .foregroundColor(OffpeakTheme.navy.opacity(0.08))
                    .offset(x: 120, y: 20)
            )
    }
    
    private var manhattanHour: Int {
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = TimeZone(identifier: "America/New_York")!
        return cal.component(.hour, from: Date())
    }
    
    private var currentLevel: CrowdLevel? {
        vm.forecast?.bars(for: .today).first(where: { $0.hour == manhattanHour && $0.hasData })?.level
    }
    
    private func busynessBadge(_ level: CrowdLevel) -> some View {
        HStack(spacing: 6) {
            Circle().fill(level.color).frame(width: 8, height: 8)
            Text("\(level.label) right now")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(OffpeakTheme.ink)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(.ultraThinMaterial, in: Capsule())
        .padding(16)
    }
    
   

}

struct ExpandableText: View {
    let text: String
    var lineLimit: Int = 4
    var threshold: Int = 160
    @State private var expanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(text)
                .font(.system(size: 15))
                .foregroundColor(OffpeakTheme.textSecondary)
                .lineSpacing(3)
                .lineLimit(expanded ? nil : lineLimit)
                .frame(maxWidth: .infinity, alignment: .leading)
                .animation(.easeInOut(duration: 0.2), value: expanded)

            if text.count > threshold {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { expanded.toggle() }
                } label: {
                    Text(expanded ? "Show less" : "Read more")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(OffpeakTheme.navy)
                }
            }
        }
    }
}
   
