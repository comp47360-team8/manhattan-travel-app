//
//  ItineraryListView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import SwiftUI

struct ItineraryListView: View {
    @EnvironmentObject private var authManager: AuthManager
    @EnvironmentObject private var savedStore: SavedPOIStore
    @StateObject private var vm = ItineraryViewModel()
    @State private var showNewTrip = false
    
    var body: some View {
        NavigationStack {
            Group{
                if authManager.isLoggedIn {
                    VStack{
                        content
                    }
                    .safeAreaInset(edge: .top, spacing: 0) { header }
                    .refreshable { await vm.load(force: true) }
                    .navigationDestination(for: String.self) { id in
                        ItineraryDetailView(id: id, onEdited: { Task { await vm.load(force: true) } })
                    }
                    .task { if authManager.isLoggedIn {await vm.load()} }
                    .fullScreenCover(isPresented: $showNewTrip, onDismiss: {
                        Task { await vm.load(force: true) }
                    }) {
                        NewTripDatesView(onClose: { showNewTrip = false })
                        .environmentObject(savedStore)
                                        }
                }else{
                    loginPrompt
                }
            }
            .background(OffpeakTheme.backGround)
        }
    }
        

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 2) {
                Text("My Itinerary")
                    .font(.system(size: 32, weight: .bold))
                    .foregroundColor(OffpeakTheme.ink)
                Text("\(vm.itineraries.count) itinerariey planned")
                    .font(.system(size: 14))
                    .foregroundColor(OffpeakTheme.textSecondary)
            }
            Spacer()
            Button { showNewTrip = true } label: {
                Image(systemName: "plus")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(OffpeakTheme.accent, in: Circle())
            }
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
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

    @ViewBuilder
    private var content: some View {
        if vm.isLoading {
            ProgressView().tint(OffpeakTheme.navy)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        } else if vm.itineraries.isEmpty {
            emptyState
        } else {
            List {
                ForEach(vm.itineraries) { it in
                    NavigationLink(value: it.id) {
                        ItineraryCard(itinerary: it)
                           
                    }
                    //.listRowInsets(EdgeInsets())
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            Task { await vm.delete(it) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(OffpeakTheme.backGround) 
            .refreshable { await vm.load(force: true) }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 36)).foregroundColor(OffpeakTheme.textTertiary)
            Text("No itineraries yet")
                .font(.system(size: 15, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
            Text("Tap + to plan your first trip")
                .font(.system(size: 13)).foregroundColor(OffpeakTheme.textSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    // MARK: Logged-out fallback
    private var loginPrompt: some View {
        LoggedOutPrompt(
            icon: "calendar.badge.checkmark",
            title: "Your trips live here",
            message: "Log in to see your saved itineraries and let Offpeak route you around the crowds."
        )
    }
}

#Preview { ItineraryListView()
        .environmentObject(SavedPOIStore())
        .environmentObject(AuthManager())}
