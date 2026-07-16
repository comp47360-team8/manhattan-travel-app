//
//  Itinerary.swift
//  ManhattanTravelApp
//
//  Created by Sean on 02/07/2026.
//


import Foundation

struct Itinerary: Identifiable, Decodable {
    let itineraryId: String
    let tripName: String
    let tripDates: String        // display string, e.g. "12 Jun, 2026 - 14 Jun, 2026"
    let numberOfPlaces: Int
    let heroImageUrl: String?

    var id: String { itineraryId }
    var name: String { tripName }
    var coverURL: URL? { heroImageUrl.flatMap { URL(string: $0) } }
    var dateRangeText: String { tripDates }
    var placesText: String { "\(numberOfPlaces) place\(numberOfPlaces == 1 ? "" : "s")" }
}


// delete the mock data when backend is ready
extension Itinerary {
    static var mock: [Itinerary] {
        func d(_ s: String) -> Date {
            let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
            return f.date(from: s) ?? .now
        }
        return []
//        return [
//            Itinerary(id: "1", name: "Long Weekend in NYC",
//                      startDate: d("2026-06-12"), endDate: d("2026-06-14"),
//                      placeCount: 9,
//                      coverImageUrl: "https://lh3.googleusercontent.com/place-photos/AJRVUZPF2V81imOkg032LX5oxjfXLw4k0jnYkXI05TOtJPXDydZNHg1NLArwBoRYODizKEZWd1CH0KUK9jx-LxI9hCOl4jjqG30uSahlxJoCgl0S712GcDNAeAJl_xAH9B47gysmAOz_aWG5dfyVZQ=s4800-w612"),
//            Itinerary(id: "2", name: "Museum Week",
//                      startDate: d("2026-07-03"), endDate: d("2026-07-07"),
//                      placeCount: 12,
//                      coverImageUrl: "https://lh3.googleusercontent.com/place-photos/AJRVUZM6xYQjQ09Rn0-HZpwnSaqRLgvvsfkAj17gaFdrNdCz2wWcswTs2C78PJUxZ4S7F4ImGUcOhHsHestZ2F6IQvLPGOgrcEhXRAMuKPwPkDxAFv4WM4amPSG3lRrFNx56IXT2T6xHolkEJentVT0kBig-=s4800-w434"),
//            Itinerary(id: "3", name: "First Time in Manhattan",
//                      startDate: d("2026-09-18"), endDate: d("2026-09-20"),
//                      placeCount: 8, coverImageUrl: nil)
//        ]
    }
}
