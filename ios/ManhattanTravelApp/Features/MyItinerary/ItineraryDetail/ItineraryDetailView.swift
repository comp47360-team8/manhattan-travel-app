//
//  ItineraryDetailView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 09/07/2026.
//


import SwiftUI

/// Identifiable wrapper so the edit flow is presented via `fullScreenCover(item:)`
/// — avoids the first-tap blank-sheet race that `isPresented:` + optional hits.
private struct EditSession: Identifiable {
    let id = UUID()
    let vm: NewTripViewModel
}

/// Read-only detail for a saved itinerary. Loads the full itinerary by id
/// and renders it with the shared `OptimizedItineraryView`.
struct ItineraryDetailView: View {
    @StateObject private var vm: ItineraryDetailViewModel
    @EnvironmentObject private var savedStore: SavedPOIStore
    @Environment(\.dismiss) private var dismiss

    private let id: String
    /// Called after a successful edit so the list can refresh.
    var onEdited: () -> Void = {}

    @State private var editSession: EditSession?
    @State private var didEdit = false

    init(id: String, onEdited: @escaping () -> Void = {}) {
        self.id = id
        self.onEdited = onEdited
        _vm = StateObject(wrappedValue: ItineraryDetailViewModel(id: id))
    }

    var body: some View {
        ZStack {
            OffpeakTheme.backGround.ignoresSafeArea()

            if let result = vm.result {
                OptimizedItineraryView(itinerary: result,
                                       onBack: { dismiss() },
                                       onEdit: { beginEdit(from: result) })
            } else if let error = vm.errorMessage {
                errorState(error)
            } else {
                loading
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .task { await vm.load() }
        .fullScreenCover(item: $editSession, onDismiss: {
            if didEdit { onEdited(); dismiss() }   // old itinerary was replaced → pop to list
            didEdit = false
        }) { session in
            NavigationStack {
                ChoosePlacesView(vm: session.vm, onClose: {
                    didEdit = true
                    editSession = nil
                })
            }
            .environmentObject(savedStore)
        }
    }

    /// Re-open the Choose Places flow, pre-filled with this itinerary's places,
    /// dates and name. Saving there replaces this itinerary (see NewTripViewModel).
    private func beginEdit(from result: OptimizedItinerary) {
        let model = NewTripViewModel()
        model.name = result.name
        model.startDate = result.days.first?.date
        model.endDate = result.days.last?.date
        model.selectedPOIs = result.days.flatMap { $0.stops.map(\.poi) }
        model.editingItineraryId = id
        model.originalSelectionSlugs = Set(model.selectedPOIs.map(\.slug))
        model.originalResult = result
        editSession = EditSession(vm: model)
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
