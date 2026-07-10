//
//  ItineraryDetailView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 09/07/2026.
//


import SwiftUI

/// Read-only detail for a saved itinerary. Loads the full itinerary by id
/// and renders it with the shared `OptimizedItineraryView`.
struct ItineraryDetailView: View {
    @StateObject private var vm: ItineraryDetailViewModel
    @Environment(\.dismiss) private var dismiss

    init(id: String) {
        _vm = StateObject(wrappedValue: ItineraryDetailViewModel(id: id))
    }

    var body: some View {
        ZStack {
            OffpeakTheme.backGround.ignoresSafeArea()

            if let result = vm.result {
                OptimizedItineraryView(itinerary: result, onBack: { dismiss() })
            } else if let error = vm.errorMessage {
                errorState(error)
            } else {
                loading
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task { await vm.load() }
    }

    // MARK: - Shared top bar (loading / error only — the result view has its own)

    private var topBar: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
                    .frame(width: 40, height: 40).background(Color.white.opacity(0.6), in: Circle())
            }
            Spacer()
        }
        .padding(.horizontal, 20).padding(.vertical, 10)
    }

    // MARK: - Loading

    private var loading: some View {
        VStack(spacing: 0) {
            topBar
            Spacer()
            ProgressView().tint(OffpeakTheme.navy)
            Spacer(); Spacer()
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Error

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 0) {
            topBar
            Spacer()
            VStack(spacing: 14) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 40)).foregroundColor(OffpeakTheme.coral)
                Text("Couldn't load this itinerary")
                    .font(.system(size: 18, weight: .bold)).foregroundColor(OffpeakTheme.ink)
                Text(message)
                    .font(.system(size: 14)).foregroundColor(OffpeakTheme.textSecondary)
                    .multilineTextAlignment(.center).padding(.horizontal, 40)
                Button { Task { await vm.load() } } label: {
                    Text("Try again")
                        .font(.system(size: 15, weight: .semibold)).foregroundColor(.white)
                        .padding(.horizontal, 28).frame(height: 48)
                        .background(OffpeakTheme.accent, in: Capsule())
                }
                .padding(.top, 4)
            }
            Spacer(); Spacer()
        }
        .frame(maxWidth: .infinity)
    }
}
