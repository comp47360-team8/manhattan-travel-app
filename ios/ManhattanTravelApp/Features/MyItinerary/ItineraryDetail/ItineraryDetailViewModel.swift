//
//  ItineraryDetailViewModel.swift
//  ManhattanTravelApp
//
//  Created by Sean on 09/07/2026.
//

import Foundation

@MainActor
final class ItineraryDetailViewModel: ObservableObject {
    @Published var result: OptimizedItinerary?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let service = ItineraryService()
    private let id: String

    init(id: String) { self.id = id }

    func load() async {
        guard result == nil else { return }
        isLoading = true; errorMessage = nil
        do {
            let dto = try await service.fetchItinerary(id: id)
            result = OptimizedItinerary.from(dto, startDate: Self.startDate(from: dto.startDate))
        } catch is CancellationError {
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private static func startDate(from isoDate: String) -> Date {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: isoDate) ?? .now
    }
}
