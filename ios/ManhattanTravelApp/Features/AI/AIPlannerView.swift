//
//  AIPlannerView.swift
//  ManhattanTravelApp
//
//  "Offpeak AI" chat — a conversational way to collect the user's trip request.
//  Header + scrolling transcript + quick-reply chips + input bar, styled with
//  OffpeakTheme to match the rest of the app.
//

import SwiftUI

struct AIPlannerView: View {
    @StateObject private var vm = AIPlannerViewModel()
    @FocusState private var inputFocused: Bool

    var body: some View {
        ZStack {
            OffpeakTheme.backGround

            VStack(spacing: 0) {
                header
                transcript
                QuickReplyRow(replies: vm.quickReplies) { vm.send($0) }
                inputBar
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 20, weight: .semibold))
                .foregroundColor(OffpeakTheme.brand)
                .frame(width: 44, height: 44)
                .background(Color.white, in: Circle())
                .overlay(Circle().stroke(OffpeakTheme.cardBorder, lineWidth: 1))

            VStack(alignment: .leading, spacing: 2) {
                Text("Offpeak AI")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(OffpeakTheme.inkTitle)
                HStack(spacing: 6) {
                    Circle().fill(OffpeakTheme.sage).frame(width: 7, height: 7)
                    Text(vm.isThinking ? "Thinking through your day…" : "Ready when you are")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(OffpeakTheme.badgeText)
                }
            }
            Spacer()
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 12)
    }

    // MARK: - Transcript

    private var transcript: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 14) {
                    ForEach(vm.messages) { message in
                        MessageBubble(message: message, onStartPlanning: vm.startPlanning)
                            .id(message.id)
                    }
                    if vm.isThinking {
                        TypingIndicator()
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .id(Self.typingID)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 4)
                .padding(.bottom, 12)
            }
            .scrollDismissesKeyboard(.interactively)
            .onChange(of: vm.messages.count) { _ in scrollToBottom(proxy) }
            .onChange(of: vm.isThinking) { _ in scrollToBottom(proxy) }
        }
    }

    private static let typingID = "typing-indicator"

    private func scrollToBottom(_ proxy: ScrollViewProxy) {
        guard let lastID = vm.isThinking ? Self.typingID : vm.messages.last?.id as AnyHashable? else { return }
        withAnimation(.easeOut(duration: 0.25)) {
            proxy.scrollTo(lastID, anchor: .bottom)
        }
    }

    // MARK: - Input bar

    private var inputBar: some View {
        HStack(spacing: 10) {
            HStack(spacing: 10) {
                TextField("Ask Offpeak…", text: $vm.input, axis: .vertical)
                    .font(.system(size: 16))
                    .foregroundColor(OffpeakTheme.ink)
                    .lineLimit(1...4)
                    .focused($inputFocused)
                    .onSubmit(send)

                Image(systemName: "mic.fill")
                    .font(.system(size: 16))
                    .foregroundColor(OffpeakTheme.textTertiary)
            }
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(Color.white.opacity(0.9), in: Capsule())
            .overlay(Capsule().stroke(OffpeakTheme.cardBorder, lineWidth: 1))

            Button(action: send) {
                Image(systemName: "paperplane.fill")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(width: 50, height: 50)
                    .background(OffpeakTheme.brand, in: Circle())
            }
            .disabled(!vm.canSend)
            .opacity(vm.canSend ? 1 : 0.5)
        }
        .padding(.horizontal, 16)
        .padding(.top, 8)
        .padding(.bottom, 6)
    }

    private func send() {
        guard vm.canSend else { return }
        vm.send()
    }
}

// MARK: - Message bubble

private struct MessageBubble: View {
    let message: ChatMessage
    let onStartPlanning: () -> Void

    var body: some View {
        switch message.role {
        case .user:
            HStack {
                Spacer(minLength: 40)
                Text(styled(message.text))
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                    .background(OffpeakTheme.brand, in: BubbleShape(isUser: true))
            }
        case .assistant:
            HStack {
                VStack(alignment: .leading, spacing: 12) {
                    Text(styled(message.text))
                        .font(.system(size: 16))
                        .foregroundColor(OffpeakTheme.ink)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(OffpeakTheme.card, in: BubbleShape(isUser: false))
                        .overlay(BubbleShape(isUser: false).stroke(OffpeakTheme.cardBorder, lineWidth: 1))

                    if let summary = message.summary {
                        TripRequestCard(summary: summary, onStartPlanning: onStartPlanning)
                    }
                }
                Spacer(minLength: 24)
            }
        }
    }

    /// Renders inline **bold** markdown; falls back to plain text.
    private func styled(_ text: String) -> AttributedString {
        (try? AttributedString(markdown: text,
            options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)))
            ?? AttributedString(text)
    }
}

/// Asymmetric rounded bubble — the tail corner is tightened on the sender's side.
private struct BubbleShape: Shape {
    let isUser: Bool
    func path(in rect: CGRect) -> Path {
        let big: CGFloat = 20, small: CGFloat = 6
        return UnevenRoundedRectangle(
            topLeadingRadius: big,
            bottomLeadingRadius: isUser ? big : small,
            bottomTrailingRadius: isUser ? small : big,
            topTrailingRadius: big
        ).path(in: rect)
    }
}

// MARK: - Trip-request summary card

private struct TripRequestCard: View {
    let summary: TripRequestSummary
    let onStartPlanning: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("YOUR TRIP REQUEST")
                .font(.system(size: 12, weight: .heavy))
                .tracking(0.8)
                .foregroundColor(OffpeakTheme.textTertiary)
                .padding(.bottom, 14)

            ForEach(Array(summary.items.enumerated()), id: \.element.id) { index, item in
                if index > 0 {
                    Divider().background(OffpeakTheme.cardBorder).padding(.vertical, 10)
                }
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: item.icon)
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundColor(OffpeakTheme.brand)
                        .frame(width: 22)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.label)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(OffpeakTheme.textSecondary)
                        Text(item.value)
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(OffpeakTheme.ink)
                    }
                    Spacer(minLength: 0)
                }
            }

            Button(action: onStartPlanning) {
                HStack(spacing: 8) {
                    Image(systemName: "wand.and.stars")
                    Text("Start planning")
                }
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(OffpeakTheme.brand, in: Capsule())
            }
            .padding(.top, 18)
        }
        .padding(18)
        .background(Color.white.opacity(0.7), in: RoundedRectangle(cornerRadius: OffpeakTheme.cardRadius))
        .overlay(RoundedRectangle(cornerRadius: OffpeakTheme.cardRadius)
            .stroke(OffpeakTheme.cardBorder, lineWidth: 1))
    }
}

// MARK: - Quick replies

private struct QuickReplyRow: View {
    let replies: [String]
    let onTap: (String) -> Void

    var body: some View {
        if !replies.isEmpty {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    Spacer(minLength: 0)
                    ForEach(replies, id: \.self) { reply in
                        Button { onTap(reply) } label: {
                            Text(reply)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(OffpeakTheme.brand)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(Color.white.opacity(0.85), in: Capsule())
                                .overlay(Capsule().stroke(OffpeakTheme.brand.opacity(0.35), lineWidth: 1))
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 8)
            }
            .transition(.opacity)
        }
    }
}

// MARK: - Typing indicator

private struct TypingIndicator: View {
    @State private var phase = 0

    var body: some View {
        HStack(spacing: 5) {
            ForEach(0..<3) { i in
                Circle()
                    .fill(OffpeakTheme.textTertiary)
                    .frame(width: 7, height: 7)
                    .opacity(phase == i ? 1 : 0.3)
            }
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 16)
        .background(OffpeakTheme.card, in: BubbleShape(isUser: false))
        .overlay(BubbleShape(isUser: false).stroke(OffpeakTheme.cardBorder, lineWidth: 1))
        .onAppear {
            withAnimation(.easeInOut(duration: 0.5).repeatForever(autoreverses: false)) {
                // driven by the timer below
            }
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(350))
                withAnimation(.easeInOut(duration: 0.25)) { phase = (phase + 1) % 3 }
            }
        }
    }
}

#Preview {
    AIPlannerView()
}
