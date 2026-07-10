//
//  NewTripDatesView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//

import SwiftUI

struct NewTripDatesView: View {
    @StateObject private var vm = NewTripViewModel()
    @Environment(\.dismiss) private var dismiss
    @State private var goToPlaces = false
    var onClose: () -> Void = {}


    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                topBar
                ScrollView {
                    VStack(alignment: .leading, spacing: 20) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Name your trip & pick dates")
                                .font(.system(size: 28, weight: .bold)).foregroundColor(OffpeakTheme.ink)
                            Text("Give it a name, then choose start and end dates.")
                                .font(.system(size: 14)).foregroundColor(OffpeakTheme.textSecondary)
                        }
                        nameField
                        RangeCalendar(start: $vm.startDate, end: $vm.endDate)
                            .padding(16)
                            .background(Color.white.opacity(0.7), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        durationRow
                    }
                    .padding(20)
                }
                continueBar
            }
            .background(OffpeakTheme.backGround)
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(isPresented: $goToPlaces) {
                ChoosePlacesView(vm: vm, onClose: onClose)
            }
        }
    }

    private var topBar: some View {
        HStack {
            Button { dismiss() } label: {
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
                    .frame(width: 40, height: 40).background(Color.white.opacity(0.6), in: Circle())
            }
            Text("New Trip").font(.system(size: 16, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
            Spacer()
            Text("Step 1 of 2").font(.system(size: 13, weight: .medium)).foregroundColor(OffpeakTheme.textSecondary)
        }
        .padding(.horizontal, 20).padding(.vertical, 10)
    }

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("TRIP NAME").font(.system(size: 11, weight: .bold)).tracking(0.8)
                .foregroundColor(OffpeakTheme.textTertiary)
            HStack(spacing: 10) {
                Image(systemName: "pencil").foregroundColor(OffpeakTheme.textTertiary)
                TextField("Trip name", text: $vm.name)
                    .font(.system(size: 16)).foregroundColor(OffpeakTheme.ink).tint(OffpeakTheme.accent)
            }
            .padding(.horizontal, 16).frame(height: 52)
            .background(Color.white.opacity(0.7), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private var durationRow: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Trip duration").font(.system(size: 12)).foregroundColor(OffpeakTheme.textSecondary)
                Text(vm.durationDays.map { "\($0)-day trip" } ?? "Pick dates")
                    .font(.system(size: 20, weight: .bold)).foregroundColor(OffpeakTheme.ink)
            }
            Spacer()
            if let range = vm.dateRangeText {
                Text(range)
                    .font(.system(size: 13, weight: .semibold)).foregroundColor(OffpeakTheme.ink)
                    .padding(.horizontal, 14).frame(height: 34)
                    .background(Color.white.opacity(0.7), in: Capsule())
            }
        }
    }

    private var continueBar: some View {
        Button { goToPlaces = true } label: {
            HStack(spacing: 8) { Text("Continue"); Image(systemName: "arrow.right") }
                .font(.system(size: 17, weight: .semibold)).foregroundColor(.white)
                .frame(maxWidth: .infinity).frame(height: 54)
                .background(vm.canContinue ? OffpeakTheme.accent : Color(hex: 0x9E948A).opacity(0.9), in: Capsule())
            
            
            
        }
        .disabled(!vm.canContinue)
        .padding(.horizontal, 20).padding(.bottom, 8)
    }
}

#Preview { NewTripDatesView().environmentObject(SavedPOIStore()) }
