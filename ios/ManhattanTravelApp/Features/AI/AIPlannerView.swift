//
//  AIPlannerView.swift
//  ManhattanTravelApp


import SwiftUI

struct AIPlannerView: View {
    @StateObject private var vm: AIPlannerViewModel
    @FocusState private var inputFocused: Bool
    
    
    @MainActor
    init(vm: AIPlannerViewModel? = nil) {
        _vm = StateObject(wrappedValue: vm ?? AIPlannerViewModel())
    }
    
    var body: some View {
        ZStack{
            OffpeakTheme.backGround
            transcript
        }
        .onTapGesture {
            inputFocused = false     
        }
        .safeAreaInset(edge: .top){
            header
        }
        .safeAreaInset(edge: .bottom){
            if let selector = vm.pendingSelector {
                    POISelectorRow(action: selector, onConfirm: vm.sendSelection)
            } else {
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
            Button {
                vm.startNewConversation()
            } label: {
                Image(systemName: "arrow.clockwise")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundColor(OffpeakTheme.brand)
                    .frame(width: 40, height: 40)
                    .background(Color.white.opacity(0.6), in: Circle())
                    .overlay(Circle().stroke(OffpeakTheme.cardBorder, lineWidth: 1))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
        .padding(.bottom, 8)
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .mask(
                    LinearGradient(
                        stops: [
                            .init(color: .black,             location: 0.0),
                            .init(color: .black,             location: 0.82),
                            .init(color: .black.opacity(0),  location: 1.0)     
                        ],
                        startPoint: .top, endPoint: .bottom)
                )
                .ignoresSafeArea(edges: .top)
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
            }
            .padding(.horizontal, 18).padding(.vertical, 12)
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
        .padding(.horizontal, 16).padding(.top, 8).padding(.bottom, 8)
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .mask(
                    LinearGradient(
                        colors: [
                            .black.opacity(0),
                            .black.opacity(0.98),
                            .black,
                            .black],
                        startPoint: .top, endPoint: .bottom)
                )
                .ignoresSafeArea(edges: .bottom)
        }
    }

    private var transcript: some View {
        ScrollViewReader{ proxy in
            
            ScrollView{
                LazyVStack(spacing: 14){
                    ForEach(vm.messages){ message in
                        MessageBubble(
                            message: message,
                            onSaveItinerary: { await vm.saveItinerary(message.rawItinerary)}
                        ).id(message.id)
                    }
                    if vm.isThinking {
                        HStack {
                            CalmRouteLoader()
                            Spacer()
                        }
                    }
                    Color.clear
                        .frame(height: 1)
                        .id("bottomAnchor")
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)
            }
            .scrollDismissesKeyboard(.interactively)   // 往下拖列表 → 收键盘
            .onChange(of: vm.messages.count) {
                withAnimation {
                    proxy.scrollTo(vm.messages.last?.id, anchor: .bottom)
                }
            }
            .onChange(of: vm.isThinking) {
                withAnimation { proxy.scrollTo("bottomAnchor", anchor: .bottom) }
            }
        }
        
    }
    private func send() {
        guard vm.canSend else { return }
        vm.send()
    }
    
    
}

    

private struct MessageBubble: View {
    let message: ChatMessage
    var onSaveItinerary: () async -> Bool = { false }
    
    var body: some View {
        switch message.role {
        case .user:
            HStack{
                Spacer()
                Text(styled(message.text))
                    .font(.system(size: 16))
                    .foregroundColor(.white)
                    .padding(.horizontal, 18).padding(.vertical, 14)
                    .background(OffpeakTheme.brand, in: BubbleShape(isUser: true))
            }
        case .assistant:
            HStack(alignment: .top){
                VStack{
                    Text(styled(message.text))
                        .font(.system(size: 16))
                        .foregroundColor(OffpeakTheme.ink)
                        .padding(.horizontal, 18).padding(.vertical, 14)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(OffpeakTheme.card, in: BubbleShape(isUser: false))
                        .overlay(BubbleShape(isUser: false).stroke(OffpeakTheme.cardBorder, lineWidth: 1))
                    if let itinerary = message.itinerary {
                        InlineItineraryCard(itinerary: itinerary, onSave: onSaveItinerary)
                    }
                }
                Spacer(minLength: 24)
            }
            
        }
        
    }
}

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


private func styled(_ text: String) -> AttributedString {
    (try? AttributedString(markdown: text,
        options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)))
        ?? AttributedString(text)
}

private struct CalmRouteLoader: View {
    @State private var phase = 0
    @State private var langIndex = 0

    private let messages = [
        "Hmm, let me think....",
        "Bomaite amháin....",
        "讓我想想...."
    ]

    var body: some View {
        HStack(spacing: 10) {
            HStack(spacing: 5) {
                ForEach(0..<3) { i in
                    Circle()
                        .fill(OffpeakTheme.brand.opacity(0.7))
                        .frame(width: 7, height: 7)
                        .opacity(phase == i ? 1 : 0.3)
                }
            }
            Text(messages[langIndex])
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(OffpeakTheme.textSecondary)
                .id(langIndex)
                .transition(.opacity)         
        }
        .padding(.horizontal, 18).padding(.vertical, 16)
        .background(OffpeakTheme.card, in: BubbleShape(isUser: false))
        .overlay(BubbleShape(isUser: false).stroke(OffpeakTheme.cardBorder, lineWidth: 1))
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(350))
                withAnimation(.easeInOut(duration: 0.25)) { phase = (phase + 1) % 3 }
            }
        }
        .task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1.6))
                withAnimation(.easeInOut(duration: 0.35)) {
                    langIndex = (langIndex + 1) % messages.count
                }
            }
        }
    }
}

#if DEBUG
#Preview {
    AIPlannerView(vm: .preview)
}
#endif
