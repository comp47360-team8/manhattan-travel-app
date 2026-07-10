//
//  SavedView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import SwiftUI

struct SavedView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var savedStore: SavedPOIStore
    @State private var selectedCategory: POICategory = .all

    private var filteredPOIs: [POI] {
        guard selectedCategory != .all else { return savedStore.savedPOIs }
        return savedStore.savedPOIs.filter { $0.type == selectedCategory.rawValue }
    }

    var body: some View {
        NavigationStack {
            Group {
                if authManager.isLoggedIn {
                    ScrollView {
                        content
                            .padding(.horizontal, 20)
                            .padding(.top, 8)
                            .padding(.bottom, 32)
                    }
                    .refreshable { await savedStore.load(force: true) }
                    .safeAreaInset(edge: .top, spacing: 0) { topBar }
                } else {
                    loginPrompt
                }
            }
            .background(OffpeakTheme.backGround)
            .navigationDestination(for: String.self) { slug in
                POIDetailView(slug: slug,
                              isSaved: savedStore.isSaved(slug: slug))
            }
            .task {
                if authManager.isLoggedIn { await savedStore.load() }
            }
        }
    }

    // MARK: Top bar
    private var topBar: some View {
        VStack(alignment: .leading, spacing: 16) {
            header
            filterChips
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .mask(
                    LinearGradient(
                        colors: [.black, .black, .black.opacity(0.5), .black.opacity(0)],
                        startPoint: .top, endPoint: .bottom)
                )
                .ignoresSafeArea(edges: .top)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("YOUR PLACES")
                .font(.system(size: 11, weight: .bold))
                .tracking(0.8)
                .foregroundColor(OffpeakTheme.navy)
                .padding(.top, 6)

            Text("Saved")
                .font(.system(size: 32, weight: .bold))
                .kerning(-0.6)
                .foregroundColor(OffpeakTheme.ink)

            Text("\(savedStore.savedPOIs.count) places saved")
                .font(.system(size: 14))
                .foregroundColor(OffpeakTheme.textSecondary)
        }
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(POICategory.allCases) { cat in
                    categoryChip(cat)
                }
            }
        }
    }

    private func categoryChip(_ cat: POICategory) -> some View {
        let selected = cat == selectedCategory
        return Button {
            selectedCategory = cat
        } label: {
            Text(cat.label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(selected ? .white : Color(hex: 0x3B4658))
                .padding(.horizontal, 16)
                .frame(height: 33)
                .background(selected ? OffpeakTheme.navy : Color.white.opacity(0.6), in: Capsule())
                .overlay(Capsule().strokeBorder(OffpeakTheme.cardBorder, lineWidth: selected ? 0 : 0.5))
        }
        .buttonStyle(.plain)
    }

    // MARK: Content states
    @ViewBuilder
    private var content: some View {
        let results = filteredPOIs
        if savedStore.isLoading {
            ProgressView()
                .tint(OffpeakTheme.navy)
                .frame(maxWidth: .infinity)
                .padding(.top, 48)
        } else if let error = savedStore.errorMessage {
            errorState(error)
        } else if results.isEmpty {
            emptyState
        } else {
            LazyVStack(spacing: 16) {
                ForEach(results) { poi in
                    NavigationLink(value: poi.slug) {
                        PlaceCard(
                            poi: poi,
                            isSaved: true,
                            onToggleSave: { Task { await savedStore.toggle(slug: poi.slug) } }
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 32))
                .foregroundColor(OffpeakTheme.textTertiary)
            Text(message)
                .font(.system(size: 14))
                .foregroundColor(OffpeakTheme.textSecondary)
                .multilineTextAlignment(.center)
            Button {
                Task { await savedStore.load(force: true) }
            } label: {
                Text("Try again")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 18)
                    .frame(height: 38)
                    .background(OffpeakTheme.navy, in: Capsule())
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 48)
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "bookmark")
                .font(.system(size: 30))
                .foregroundColor(OffpeakTheme.textTertiary)
            Text("No saved places yet")
                .font(.system(size: 14))
                .foregroundColor(OffpeakTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 48)
    }

    // MARK: Logged-out fallback
    private var loginPrompt: some View {
        LoggedOutPrompt(
            icon: "bookmark",
            title: "Save your favorite places",
            message: "Log in to bookmark attractions and organize them into lists for every trip."
        )
    }
}

#Preview {
    SavedView()
        .environmentObject(AuthManager())
        .environmentObject(SavedPOIStore())
}
