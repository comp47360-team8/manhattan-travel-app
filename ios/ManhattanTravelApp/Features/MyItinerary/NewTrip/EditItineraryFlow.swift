//
//  EditItineraryFlow.swift
//  ManhattanTravelApp
//
//  Created by Sean on 23/07/2026.
//

import SwiftUI

/// The edit flow presented inside a full-screen cover from the itinerary list:
/// pick places → optimise → result. It owns its own navigation path, so every
/// presentation starts from a clean stack (no leftover `.optimizing` step).
struct EditItineraryFlow: View {
    @ObservedObject var vm: NewTripViewModel
    @EnvironmentObject private var savedStore: SavedPOIStore
    @State private var path = NavigationPath()

    /// Fired when Generate is tapped — the list clears its own stack so that
    /// closing this cover returns to the list rather than the old detail.
    var onGenerate: () -> Void = {}
    /// Closes the cover (back to the itinerary list).
    var onClose: () -> Void = {}

    var body: some View {
        NavigationStack(path: $path) {
            ChoosePlacesView(vm: vm, path: $path, onGenerate: onGenerate)
                .navigationDestination(for: NewTripStep.self) { step in
                    if case .optimizing = step {
                        OptimizingView(vm: vm, onClose: onClose)
                    }
                }
                .navigationDestination(for: POIRoute.self) { route in
                    POIDetailView(slug: route.slug, isSaved: savedStore.isSaved(slug: route.slug))
                }
        }
    }
}
