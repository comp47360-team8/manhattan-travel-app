//
//  OptimizingView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 06/07/2026.
//

import SwiftUI

/// Loading skeleton shown while Offpeak AI builds the itinerary.
/// Swaps itself for `OptimizedItineraryView` once `vm.result` is ready.
struct OptimizingView: View {
    @ObservedObject var vm: NewTripViewModel
    @Environment(\.dismiss) private var dismiss

    private var dayCount: Int { vm.durationDays ?? 1 }

    var body: some View {
        ZStack {
            OffpeakTheme.backGround
            if let result = vm.result {
                OptimizedItineraryView(itinerary: result, onBack: { dismiss() })
                    .transition(.opacity)
            } else {
                loading
                    .transition(.opacity)
            }
        }
        .navigationBarBackButtonHidden(true)
        .toolbar(.hidden, for: .navigationBar)
        .animation(.easeInOut(duration: 0.3), value: vm.result == nil)
        .task {
            if vm.result == nil { await vm.generate() }
        }
    }

    // MARK: Loading content

    private var loading: some View {
        VStack(spacing: 0) {
            topBar
            ScrollView {
                VStack(spacing: 24) {
                    badge.padding(.top, 24)

                    VStack(spacing: 10) {
                        Text("Building your calm route")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(OffpeakTheme.ink)
                        Text("Offpeak AI is checking crowd forecasts and spacing your \(vm.selectedPOIs.count) stops across the quietest hours.")
                            .font(.system(size: 14))
                            .foregroundColor(OffpeakTheme.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 36)
                    }

                    progressRow

                    VStack(spacing: 14) {
                        ForEach(0..<3, id: \.self) { _ in skeletonCard }
                    }
                    .padding(.top, 8)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 40)
                .frame(maxWidth: .infinity)
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
            Spacer()
        }
        .padding(.horizontal, 20).padding(.vertical, 10)
    }

    private var badge: some View {
        Image(systemName: "sparkle")
            .font(.system(size: 26, weight: .semibold))
            .foregroundColor(.white)
            .frame(width: 64, height: 64)
            .background(OffpeakTheme.accent, in: Circle())
            .shadow(color: OffpeakTheme.accent.opacity(0.35), radius: 12, y: 6)
    }

    private var progressRow: some View {
        HStack(spacing: 8) {
            ProgressView().controlSize(.small).tint(OffpeakTheme.accent)
            Text("Optimizing Day \(min(vm.optimizeDay, dayCount)) of \(dayCount)…")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(OffpeakTheme.textSecondary)
        }
    }

    private var skeletonCard: some View {
        HStack(spacing: 14) {
            SkeletonBlock(cornerRadius: 14).frame(width: 64, height: 64)
            VStack(alignment: .leading, spacing: 9) {
                SkeletonBlock(cornerRadius: 6).frame(width: 130, height: 12)
                SkeletonBlock(cornerRadius: 6).frame(height: 10).padding(.trailing, 24)
                SkeletonBlock(cornerRadius: 6).frame(height: 10).padding(.trailing, 70)
            }
            Spacer(minLength: 0)
        }
        .padding(14)
        .background(Color.white.opacity(0.45), in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
}

/// A shimmering placeholder block for skeleton screens.
struct SkeletonBlock: View {
    var cornerRadius: CGFloat = 12
    @State private var animate = false

    var body: some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .fill(Color.white.opacity(0.5))
            .overlay(
                GeometryReader { geo in
                    let w = geo.size.width
                    LinearGradient(colors: [.clear, .white.opacity(0.85), .clear],
                                   startPoint: .leading, endPoint: .trailing)
                        .frame(width: w * 0.55)
                        .offset(x: animate ? w : -w * 0.55)
                }
            )
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .onAppear {
                withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                    animate = true
                }
            }
    }
}

#if DEBUG
#Preview {
    NavigationStack {
        OptimizingView(vm: {
            let vm = NewTripViewModel()
            vm.startDate = Date()
            vm.endDate = Calendar.current.date(byAdding: .day, value: 2, to: Date())
            return vm
        }())
    }
}
#endif
