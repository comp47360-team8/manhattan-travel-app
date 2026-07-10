//
//  ChoosePlacesView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import SwiftUI

struct ChoosePlacesView: View {
    @ObservedObject var vm: NewTripViewModel
    @EnvironmentObject private var savedStore: SavedPOIStore
    @Environment(\.dismiss) private var dismiss
    var onClose: () -> Void = {}

    @State private var search = ""
    @State private var accessibleOnly = false
    @State private var goToOptimize = false

    var body: some View {
        ZStack {
            OffpeakTheme.backGround
            ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                if !savedPlaces.isEmpty {
                    section("SAVED", savedPlaces)
                }
                if vm.isLoadingPlaces {
                    ProgressView()
                        .tint(OffpeakTheme.navy)
                        .frame(maxWidth: .infinity)
                        .padding(.top, 40)
                } else if !popularPlaces.isEmpty {
                    gridSection("POPULAR", popularPlaces)
                } else if noResults {
                    emptyState
                }
            }
            .padding(.top, 8)
            .padding(.bottom, 20)
        }
            .safeAreaInset(edge: .top, spacing: 0) { pinnedHeader }
            .safeAreaInset(edge: .bottom, spacing: 0) { generateBar }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .navigationDestination(isPresented: $goToOptimize) {
            OptimizingView(vm: vm, onClose: onClose)
        }
        .task {
            await vm.loadPlaces()
            await savedStore.load()
        }
    }

    // MARK: - Section data

    /// Slugs already surfaced in the SELECTED row, so other rows don't repeat them.
    private var selectedSlugs: Set<String> { Set(vm.selectedPOIs.map(\.slug)) }

    private var selectedPlaces: [POI] { vm.selectedPOIs }

    private var savedPlaces: [POI] {
        filtered(savedStore.savedPOIs).filter { !selectedSlugs.contains($0.slug) }
    }

    private var popularPlaces: [POI] {
        let savedSlugs = Set(savedStore.savedPOIs.map(\.slug))
        return filtered(vm.allPOIs).filter {
            !selectedSlugs.contains($0.slug) && !savedSlugs.contains($0.slug)
        }
    }

    private var noResults: Bool {
        selectedPlaces.isEmpty && savedPlaces.isEmpty && popularPlaces.isEmpty
    }

    private func filtered(_ pois: [POI]) -> [POI] {
        var r = pois
        if accessibleOnly { r = r.filter { $0.access != nil } }
        let q = search.trimmingCharacters(in: .whitespaces)
        if !q.isEmpty {
            r = r.filter {
                $0.name.localizedCaseInsensitiveContains(q)
                || ($0.neighborhood?.localizedCaseInsensitiveContains(q) ?? false)
            }
        }
        return r
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 28)).foregroundColor(OffpeakTheme.textTertiary)
            Text("No matching places")
                .font(.system(size: 14)).foregroundColor(OffpeakTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 40)
    }

    /// Everything from the title down through the "Select up to…" hint stays
    /// pinned; SAVED / POPULAR scroll underneath its frosted, bottom-fading edge.
    private var pinnedHeader: some View {
        VStack(alignment: .leading, spacing: 16) {
            topBar
            Text("Where do you want to go?")
                .font(.system(size: 26, weight: .bold)).foregroundColor(OffpeakTheme.ink)
                .padding(.horizontal, 20)
            searchBar.padding(.horizontal, 20)
            filterRow.padding(.horizontal, 20)
            Text("Select up to **\(vm.placeLimit) preferred places.** Offpeak AI will automatically distribute them evenly across your trip days.")
                .font(.system(size: 13)).foregroundColor(OffpeakTheme.textSecondary)
                .padding(.horizontal, 20)
            if !selectedPlaces.isEmpty {
                section("SELECTED", selectedPlaces)
                    .padding(.bottom, 8)
            }
                
            
        }
        .padding(.bottom, 14)
        .background
        {
            ZStack {
                Rectangle().fill(.thinMaterial)
                OffpeakTheme.backgroundGradient
                    .opacity(0.55)
            }
            .mask(
                LinearGradient(
                    stops: [
                        .init(color: .black, location: 0.0),
                        .init(color: .black.opacity(0.9), location: 0.8),
                        .init(color: .black.opacity(0.8), location: 0.9),
                        .init(color: .black.opacity(0.0), location: 1.0)
                    ],
                    startPoint: .top, endPoint: .bottom)
            )
            .ignoresSafeArea(edges: .top)
        }
    }

    private var topBar: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
                    .frame(width: 40, height: 40).background(Color.white.opacity(0.6), in: Circle())
            }
            Text("Choose places").font(.system(size: 16, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
            Spacer()
            Text("\(vm.selectedPOIs.count)/\(vm.placeLimit) · \(vm.durationDays ?? 0) Days")
                .font(.system(size: 12, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
                .padding(.horizontal, 12).frame(height: 30)
                .background(Color.white.opacity(0.7), in: Capsule())
        }
        .padding(.horizontal, 20).padding(.vertical, 10)
    }

    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass").foregroundColor(OffpeakTheme.textTertiary)
            TextField("Search Manhattan attractions", text: $search)
                .font(.system(size: 15)).tint(OffpeakTheme.accent)
        }
        .padding(.horizontal, 16).frame(height: 48)
        .background(Color.white.opacity(0.7), in: Capsule())
    }

    private var filterRow: some View {
        HStack(spacing: 8) {
            Text("Filter:").font(.system(size: 13)).foregroundColor(OffpeakTheme.textSecondary)
            Button { accessibleOnly.toggle() } label: {
                HStack(spacing: 6) {
                    Image(systemName: "figure.roll")
                    Text("Accessible only")
                }
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(accessibleOnly ? .white : OffpeakTheme.accent)
                .padding(.horizontal, 14).frame(height: 32)
                .background(accessibleOnly ? OffpeakTheme.accent : Color.white.opacity(0.7), in: Capsule())
            }
            .buttonStyle(.plain)
            Spacer()
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title).font(.system(size: 12, weight: .bold)).tracking(0.8)
            .foregroundColor(OffpeakTheme.textTertiary).padding(.horizontal, 20)
    }

    /// A single tappable card with the shared select / at-limit behaviour.
    @ViewBuilder
    private func cardCell(_ poi: POI, fillWidth: Bool) -> some View {
        let selected = vm.isSelected(poi)
        let blocked = !selected && vm.atLimit
        SelectablePOICard(poi: poi, isSelected: selected, fillWidth: fillWidth)
            .opacity(blocked ? 0.4 : 1)
            .onTapGesture { vm.toggle(poi) }
            .allowsHitTesting(!blocked)
            .animation(.easeInOut(duration: 0.2), value: selected)
    }

    /// Horizontal, single-row scroller — used for the smaller SELECTED / SAVED sets.
    private func section(_ title: String, _ pois: [POI]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            
            sectionHeader(title)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(pois) { poi in cardCell(poi, fillWidth: false) }
                }
                .padding(.horizontal, 20)
            }
        }
        
    }

    /// Vertical 3-column grid — shows every card, growing downward (no hidden overflow).
    private func gridSection(_ title: String, _ pois: [POI]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(title)
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10), count: 3),
                      spacing: 10) {
                ForEach(pois) { poi in cardCell(poi, fillWidth: false)}
            }
            .padding(.horizontal, 20)
        }
    }

    private var generateBar: some View {
        Button { vm.result = nil; vm.errorMessage = nil; goToOptimize = true } label: {
            HStack(spacing: 8) { Text("Generate"); Image(systemName: "arrow.right") }
                .font(.system(size: 17, weight: .semibold)).foregroundColor(.white)
                .frame(maxWidth: .infinity).frame(height: 54)
                .background(vm.canGenerate ? OffpeakTheme.accent : Color(hex: 0x9E948A).opacity(0.9), in: Capsule())
        }
        .disabled(!vm.canGenerate)
        .padding(.horizontal, 20)
        .padding(.top, 16)
        .padding(.bottom, 8)
        .background {
            Rectangle()
                .fill(.regularMaterial)
                .mask(
                    LinearGradient(
                        colors: [.black.opacity(0), .black.opacity(0.6), .black, .black],
                        startPoint: .top, endPoint: .bottom)
                )
                .ignoresSafeArea(edges: .bottom)
        }
    }
}

#if DEBUG
private func previewPOI(_ slug: String, _ name: String, _ hood: String,
                       _ type: String, hero: String? = nil,
                       accessible: Bool = false) -> POI {
    POI(slug: slug, name: name, type: type, neighborhood: hood,
        heroImageUrl: hero,
        accessibilityLabels: accessible ? ["wheelchair"] : nil)
}

#Preview {
    let saved = [
        previewPOI("empire-state-building", "Empire State Building",
                   "Midtown South-Flatiron", "viewpoint", accessible: true)
    ]

    let popular = [
        previewPOI("9-11-memorial", "9/11 Memorial", "Financial District", "landmark"),
        previewPOI("central-park", "Central Park", "Central Park", "park",
                   accessible: true),
        previewPOI("times-square", "Times Square", "Midtown-Times Square",
                   "landmark", accessible: true),
        previewPOI("chrysler-building", "Chrysler Building", "Midtown East",
                   "landmark"),
        previewPOI("top-of-the-rock", "Top of the Rock", "Midtown", "viewpoint",
                   accessible: true),
        previewPOI("one-world-observatory", "One World Observatory",
                   "Financial District", "viewpoint", accessible: true)
    ]

    let vm = NewTripViewModel()
    vm.name = "Long Weekend in NYC"
    vm.startDate = d("2026-06-12")
    vm.endDate = d("2026-06-19")            // 8 days
    vm.allPOIs = saved + popular
    // allPOIs non-empty makes `loadPlaces()` skip the network in the preview.

    return NavigationStack {
        ChoosePlacesView(vm: vm)
            .environmentObject(SavedPOIStore.previewStore(saved))
    }
}
#endif

