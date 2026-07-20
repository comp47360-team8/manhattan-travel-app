//
//  AIPlannerViewModel.swift
//  ManhattanTravelApp
//
//  Conversation state for the Offpeak AI planner. Owns the running transcript,
//  the collected trip request, and the quick-reply chips; delegates the actual
//  "what does the assistant say next" to an `AIPlannerServing`.
//

import Foundation

@MainActor
final class AIPlannerViewModel: ObservableObject {
    @Published private(set) var messages: [ChatMessage] = []
    @Published var input: String = ""
    @Published private(set) var isThinking = false
    @Published private(set) var quickReplies: [String] = []

    /// The request being assembled over the conversation.
    private(set) var draft = TripRequestDraft()

    private let service: AIPlannerServing
    private var replyTask: Task<Void, Never>?

    init(service: AIPlannerServing = MockAIPlannerService()) {
        self.service = service
        let opening = service.greeting()
        messages = [ChatMessage(role: .assistant, text: opening.text)]
        draft = opening.draft
        quickReplies = opening.quickReplies
    }

    var canSend: Bool {
        !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isThinking
    }

    /// Send the current input (or an explicit quick-reply string).
    func send(_ explicit: String? = nil) {
        let text = (explicit ?? input).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isThinking else { return }

        input = ""
        quickReplies = []
        messages.append(ChatMessage(role: .user, text: text))
        isThinking = true

        replyTask?.cancel()
        replyTask = Task { [weak self] in
            guard let self else { return }
            do {
                let reply = try await service.reply(to: text, draft: draft)
                guard !Task.isCancelled else { return }
                draft = reply.draft
                messages.append(ChatMessage(role: .assistant, text: reply.text, summary: reply.summary))
                quickReplies = reply.quickReplies
            } catch is CancellationError {
                return
            } catch {
                messages.append(ChatMessage(
                    role: .assistant,
                    text: "Sorry — I couldn't think that through just now. Mind trying again?"
                ))
            }
            isThinking = false
        }
    }

    /// Seam for the (not-yet-built) generation step. For now it just confirms in
    /// chat that the request has been captured.
    /// TODO: hand `draft` to the itinerary generator once the backend exists.
    func startPlanning() {
        guard !isThinking else { return }
        quickReplies = []
        messages.append(ChatMessage(
            role: .assistant,
            text: "Got it — I've saved your request. Crowd-smart itinerary generation is coming soon; I'll build this the moment it lands."
        ))
    }
}
