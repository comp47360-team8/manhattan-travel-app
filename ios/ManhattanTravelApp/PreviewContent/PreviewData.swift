//
//  PreviewData.swift
//  ManhattanTravelApp
//
//  Created by Sean on 30/06/2026.
//
import Foundation

#if DEBUG
func mockUpData() -> [POI] {
    let mockUpJson = """
    [
    {
        "slug": "times-square",
        "name": "Times Square",
        "type": "landmark",
        "address": "Manhattan, NY 10036",
        "summary": "Times Square is one of the world's busiest pedestrian intersections, tourist destinations, and entertainment hubs. It is formed by the junction of Broadway, Seventh Avenue, and 42nd Street in Midtown Manhattan, New York City. Together with adjacent Duffy Square, Times Square is a bowtie-shaped plaza five blocks long between 42nd and 47th Streets. As a major epicenter of the world's entertainment industry and as the physical hub of the Theater District, where most Broadway theaters are located, Times Square is brightly and incessantly illuminated by numerous digital billboards and advertisements as well as businesses offering 24/7 service.",
        "description": "Times Square is one of the world's busiest pedestrian intersections, tourist destinations, and entertainment hubs. It is formed by the junction of Broadway, Seventh Avenue, and 42nd Street in Midtown Manhattan, New York City. Together with adjacent Duffy Square, Times Square is a bowtie-shaped plaza five blocks long between 42nd and 47th Streets. As a major epicenter of the world's entertainment industry and as the physical hub of the Theater District, where most Broadway theaters are located, Times Square is brightly and incessantly illuminated by numerous digital billboards and advertisements as well as businesses offering 24/7 service.\nTimes Square is one of the world's most visited tourist attractions, drawing an estimated 50 million visitors annually. Approximately 330,000 people pass through Times Square daily, many of them tourists, while over 460,000 pedestrians walk through Times Square on its busiest days. The Times Square–42nd Street and 42nd Street–Port Authority Bus Terminal stations have consistently ranked as the busiest in the New York City Subway system, transporting more than 200,000 passengers daily. The Times Square neighborhood takes its name after the intersection.\nFormerly known as Longacre Square, Times Square was renamed in 1904 after The New York Times moved its headquarters to the then newly erected Times Building, now One Times Square. It is the site of the annual New Year's Eve ball drop, which began on December 31, 1907, and continues to attract over a million visitors to Times Square every year, in addition to a worldwide audience of one billion or more on various digital media platforms.\nTimes Square, specifically the intersection of Broadway and 42nd Street, is the eastern terminus of the Lincoln Highway, the first road across the United States for motorized vehicles. Times Square is sometimes referred to as \"the Crossroads of the World\", \"the Center of the Universe\", and \"the heart of the Great White Way\".",
        "borough": "Manhattan",
        "neighborhood": "Midtown-Times Square",
        "phone": null,
        "latitude": 40.7579747,
        "longitude": -73.9855426,
        "hero_image_url_2": "https://lh3.googleusercontent.com/place-photos/AJRVUZOFkVgK3IV-hITi94XcWyX4Fv6DV2FpT4Mssc5k4Xt6xGk3GR3IQiTAlqIhGxfTI8INXooaRl3NizXNEW11vzMlj05tPGAW7uz5ISd5iZguebuOrXQ11qbPmlDJoVWV_R5RiKnfnCET8UfR=s4800-w800",
        "gallery_image_urls_2": [
            "https://lh3.googleusercontent.com/place-photos/AJRVUZM1IYKeCANzrJxJye8xjT9kAPjEQnK0ggl-VzClRgXgQ2wnNWm141l7io6HRcdXlbOep0brBqgkWfe-Wpl9FOzt2KLUMiLKW7W9P8gR2NWugM3WFcCQ18I8fPIP-kyvDfM_TudLJaU78HQ=s4800-w800",
            "https://lh3.googleusercontent.com/place-photos/AJRVUZPQXys3XjDk5wNy4ta5MHcgWudF3GQNt_rnXc5x3RCqa6hDGmMmoASbtiDwp4bq1VvZ0JJ_gIEjceAwi8pkAqa6wl68W58b9M5muoD2GU5dLOZ0280IMJi1lFjct8ycuJA5Z44h45jmZUjOwAugENHN=s4800-w800",
            "https://lh3.googleusercontent.com/place-photos/AJRVUZOuzRSTM4LSIuTIx8uVxSNS2YE8L3okBg0gyBvrMVUnQ8BO-oHAcdVS7iUwwbndmtEJHJgjnoNvn72x4pJvyQJ6SAPwMkzCe44lI752pQ8AamimMgUFeDdipga_E3QkEwy-CcoFeCOQWa7Y=s4800-w800"
        ],
        "opening_hours": null,
        "opening_hours_text": null,
        "google_review_star": 4.7,
        "google_review_count": 243735,
        "current_busyness": 67,
        "current_busyness_at": null,
        "best_time_start": "08:00:00",
        "best_time_end": "10:00:00",
        "best_time_label": "Weekday mornings",
        "why_this_time": "Evenings and weekends push crowd levels above 85%; weekday mornings have far fewer tourists and better photo opportunities.",
        "accessibility_labels": [
            "wheelchair"
        ],
        "admission_fee": null,
        "admission_text": null,
        "recommended_duration_min": 45,
        "closest_subway": "Times Sq-42 St (N,Q,R,W,S,1,2,3,7)/42 St (A,C,E)",
        "map_embed_url": "https://www.google.com/maps/embed/v1/place?key=AIzaSyC1g4kcF24ADMnnTKrUSuvmbM1iGQ1qdGA&q=place_id:ChIJmQJIxlVYwokRLgeuocVOGVU",
        "map_external_url": "https://www.google.com/maps/search/?api=1&query=Times+Square&query_place_id=ChIJmQJIxlVYwokRLgeuocVOGVU",
        "website_url": "https://www.timessquarenyc.org/",
        "tags": [
            "plaza",
            "attraction",
            "outdoor",
            "wheelchair"
        ]
    }
    ]
    """
    
    let data = Data(mockUpJson.utf8)
    let decoder = JSONDecoder()
    decoder.keyDecodingStrategy = .convertFromSnakeCase
    do {
        let pois = try decoder.decode([POI].self, from: data)
                return pois
            } catch {
                print("Decode error:", error)
                return []
            }
}

func d(_ s: String) -> Date {
    let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
    return f.date(from: s) ?? .now
}

let itineraryMock = Itinerary(itineraryId: "1", tripName: "Long Weekend in NYC",
                              tripDates: "12 Jun, 2026 - 14 Jun, 2026",
                              numberOfPlaces: 9,
                              heroImageUrl: "https://lh3.googleusercontent.com/place-photos/AJRVUZPF2V81imOkg032LX5oxjfXLw4k0jnYkXI05TOtJPXDydZNHg1NLArwBoRYODizKEZWd1CH0KUK9jx-LxI9hCOl4jjqG30uSahlxJoCgl0S712GcDNAeAJl_xAH9B47gysmAOz_aWG5dfyVZQ=s4800-w612")


#endif
