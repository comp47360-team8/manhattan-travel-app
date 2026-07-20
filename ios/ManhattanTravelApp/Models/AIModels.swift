//
//  AIModels.swift
//  ManhattanTravelApp
//
//  Models for the "Offpeak AI" planner — a conversational way to *collect* a
//  user's trip request (length, interests, pace, accessibility) instead of the
//  form-based "pick dates / select places" flow. The assistant asks questions
//  and builds up a `TripRequestDraft`; once it has enough, it shows a summary
//  card. No itinerary is mutated here — generation is a later, backend step.
//

import SwiftUI

/// Who authored a chat message.
enum ChatRole {
    case user
    case assistant
}

/// A single message in the planner conversation. Assistant messages may carry a
/// `summary` card rendered beneath the bubble once enough has been collected.
struct ChatMessage: Identifiable {
    let id = UUID()
    let role: ChatRole
    let text: String
    var summary: TripRequestSummary? = nil

    init(role: ChatRole, text: String, summary: TripRequestSummary? = nil) {
        self.role = role
        self.text = text
        self.summary = summary
    }
}

/// How busy the user wants their days.
enum TripPace: String {
    case relaxed  = "Relaxed"
    case balanced = "Balanced"
    case packed   = "Packed"
}

/// The evolving trip request the assistant collects over the conversation.
/// Everything is optional so it can be filled in any order and inspected for
/// what's still missing.
struct TripRequestDraft {
    var length: String?            // free text as the user phrased it, e.g. "3 days"
    var dates: String?             // e.g. "Jul 20–22" — collected, not validated
    var interests: [String] = []   // ["Museums", "Parks", ...]
    var pace: TripPace?
    var accessibility: [String] = []   // ["Step-free", ...]
    var notes: [String] = []       // anything else the user mentions

    /// Enough gathered to hand off to the planner.
    var isReadyToSummarize: Bool {
        (length != nil || dates != nil) && !interests.isEmpty && pace != nil
    }
}

/// One line in the trip-request summary card.
struct SummaryItem: Identifiable {
    let id = UUID()
    let icon: String   // SF Symbol
    let label: String
    let value: String
}

/// A snapshot of the collected request, rendered as a card in the chat.
struct TripRequestSummary: Identifiable {
    let id = UUID()
    let items: [SummaryItem]

    /// Builds the card rows from a draft, skipping anything not yet collected.
    init(from draft: TripRequestDraft) {
        var rows: [SummaryItem] = []
        if let length = draft.length {
            rows.append(SummaryItem(icon: "clock", label: "Length", value: length))
        }
        if let dates = draft.dates {
            rows.append(SummaryItem(icon: "calendar", label: "Dates", value: dates))
        }
        if !draft.interests.isEmpty {
            rows.append(SummaryItem(icon: "sparkles", label: "Interests",
                                    value: draft.interests.joined(separator: ", ")))
        }
        if let pace = draft.pace {
            rows.append(SummaryItem(icon: "figure.walk", label: "Pace", value: pace.rawValue))
        }
        if !draft.accessibility.isEmpty {
            rows.append(SummaryItem(icon: "figure.roll", label: "Access",
                                    value: draft.accessibility.joined(separator: ", ")))
        }
        if !draft.notes.isEmpty {
            rows.append(SummaryItem(icon: "text.quote", label: "Also",
                                    value: draft.notes.joined(separator: "; ")))
        }
        self.items = rows
    }
}
