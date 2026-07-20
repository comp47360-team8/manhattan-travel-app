//
//  AIPlannerService.swift
//  ManhattanTravelApp
//
//  Backend for the "Offpeak AI" planner. The real service will call the LLM
//  planning endpoint; until that exists, `MockAIPlannerService` runs a small
//  scripted intake that collects the user's trip request client-side.
//
//  TODO: replace MockAIPlannerService with a real implementation that calls
//  e.g. POST /api/ai/plan and returns the assistant's turn + updated draft.
//

import Foundation

/// One assistant turn: what it says, the request it has collected so far, the
/// quick-reply chips to offer next, and — once ready — a summary card.
struct AIReply {
    let text: String
    let draft: TripRequestDraft
    let quickReplies: [String]
    var summary: TripRequestSummary? = nil
}

/// Drives the planner conversation. Swap the mock for a networked implementation
/// without touching the view model.
protocol AIPlannerServing {
    /// The opening assistant turn shown when the tab first appears.
    func greeting() -> AIReply
    /// The assistant's reply to a user message, given the request collected so far.
    func reply(to userMessage: String, draft: TripRequestDraft) async throws -> AIReply
}

/// Scripted stand-in: a keyword-driven intake state machine. It reads whatever
/// the user typed into the running `draft`, then asks for the next missing piece
/// (length/dates → interests → pace → accessibility) and finally summarizes.
struct MockAIPlannerService: AIPlannerServing {

    func greeting() -> AIReply {
        AIReply(
            text: "Hi — I'm **Offpeak AI**. Tell me what kind of trip you want and I'll shape a crowd-smart plan around it.\n\nHow long are you in New York?",
            draft: TripRequestDraft(),
            quickReplies: ["A weekend", "3 days", "A full week"]
        )
    }

    func reply(to userMessage: String, draft: TripRequestDraft) async throws -> AIReply {
        // Simulate the model "thinking through your day…".
        try await Task.sleep(for: .milliseconds(1100))
        try Task.checkCancellation()

        var draft = draft
        absorb(userMessage, into: &draft)

        // Ready to hand off — show the summary card.
        if draft.isReadyToSummarize {
            return AIReply(
                text: "Perfect — here's what I've got. Anything you'd change before I start planning?",
                draft: draft,
                quickReplies: ["Add accessibility", "Add a must-see", "Looks good"],
                summary: TripRequestSummary(from: draft)
            )
        }

        // Otherwise ask for the next missing piece.
        return nextQuestion(for: draft)
    }

    // MARK: - Parsing the user's message into the draft

    private func absorb(_ raw: String, into draft: inout TripRequestDraft) {
        let text = raw.lowercased()

        // Trip length
        if draft.length == nil {
            if text.contains("weekend") {
                draft.length = "A weekend"
            } else if text.contains("week") {
                draft.length = "A week"
            } else if let n = firstNumber(in: text), text.contains("day") {
                draft.length = "\(n) day\(n == 1 ? "" : "s")"
            }
        }

        // Interests
        for (keyword, label) in Self.interestKeywords where text.contains(keyword) {
            if !draft.interests.contains(label) { draft.interests.append(label) }
        }

        // Pace
        if draft.pace == nil {
            if text.contains("relax") || text.contains("calm") || text.contains("slow") || text.contains("easy") || text.contains("chill") {
                draft.pace = .relaxed
            } else if text.contains("pack") || text.contains("lots") || text.contains("busy") || text.contains("fast") || text.contains("everything") {
                draft.pace = .packed
            } else if text.contains("balance") || text.contains("mix") || text.contains("moderate") {
                draft.pace = .balanced
            }
        }

        // Accessibility
        for (keyword, label) in Self.accessibilityKeywords where text.contains(keyword) {
            if !draft.accessibility.contains(label) { draft.accessibility.append(label) }
        }
    }

    // MARK: - Next intake question

    private func nextQuestion(for draft: TripRequestDraft) -> AIReply {
        if draft.length == nil && draft.dates == nil {
            return AIReply(
                text: "No problem. Roughly how many days are you planning for?",
                draft: draft,
                quickReplies: ["A weekend", "3 days", "A full week"]
            )
        }
        if draft.interests.isEmpty {
            return AIReply(
                text: "Great. What are you most in the mood for? Pick a few or tell me in your own words.",
                draft: draft,
                quickReplies: ["Museums & galleries", "Parks & views", "Food & markets", "Iconic landmarks"]
            )
        }
        if draft.pace == nil {
            return AIReply(
                text: "Got it. Do you want each day relaxed, balanced, or packed?",
                draft: draft,
                quickReplies: ["Relaxed", "Balanced", "Packed"]
            )
        }
        // Fallback (shouldn't normally reach here before summarizing).
        return AIReply(
            text: "Anything else I should know — accessibility needs or a must-see?",
            draft: draft,
            quickReplies: ["Step-free routes", "No, that's it"]
        )
    }

    // MARK: - Keyword tables

    private static let interestKeywords: [(String, String)] = [
        ("museum", "Museums"), ("galler", "Galleries"),
        ("park", "Parks"), ("view", "Views"), ("nature", "Parks"),
        ("food", "Food"), ("market", "Markets"), ("eat", "Food"), ("restaurant", "Food"),
        ("landmark", "Landmarks"), ("iconic", "Landmarks"), ("sight", "Landmarks"),
        ("art", "Galleries"), ("shop", "Shopping")
    ]

    private static let accessibilityKeywords: [(String, String)] = [
        ("wheelchair", "Wheelchair"), ("step-free", "Step-free"), ("step free", "Step-free"),
        ("stroller", "Step-free"), ("accessible", "Step-free"), ("mobility", "Step-free")
    ]

    private func firstNumber(in text: String) -> Int? {
        let words = ["one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
                     "six": 6, "seven": 7, "a couple": 2, "a few": 3]
        for (word, n) in words where text.contains(word) { return n }
        let digits = text.split(whereSeparator: { !$0.isNumber }).compactMap { Int($0) }
        return digits.first
    }
}
