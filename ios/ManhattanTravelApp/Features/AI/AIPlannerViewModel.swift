//
//  AIPlannerViewModel.swift
//  ManhattanTravelApp
//


import Foundation

@MainActor
final class AIPlannerViewModel: ObservableObject {
    @Published private(set) var messages: [ChatMessage] = []
    @Published var input: String = ""
    @Published var isThinking: Bool = false
    @Published private(set) var pendingSelector: UIActionDTO? = nil
    
    
    private let service: AIPlannerServing
    private let itineraryService: ItineraryService = ItineraryService()
    private var replyTask: Task<Void, Never>?
    
    init(
        service: AIPlannerServing = AIPlannerService(),
    ){
        self.service = service
        messages = [ChatMessage(role: .assistant,
                                text: service.greeting().text)]
    }
      
    var canSend: Bool {
        !input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isThinking
    }
    
    func send(_ explicit: String? = nil) {
        let text = (explicit ?? input).trimmingCharacters(in: .whitespacesAndNewlines)
        
        guard !text.isEmpty && !isThinking else { return }
        
        input = ""
        pendingSelector = nil
        messages.append(ChatMessage(role: .user, text: text))
        isThinking = true
        
        replyTask?.cancel()
        replyTask = Task { [weak self] in
            guard let self else { return }
            do {
                let reply = try await service.reply(to: text)
                guard !Task.isCancelled else { return }
                let chatMessage = ChatMessage(
                    role: .assistant,
                    text: reply.text,
                    itinerary: reply.itinerary,
                    rawItinerary: reply.rawItinerary)

                messages.append(chatMessage)
                pendingSelector = reply.uiAction
            } catch is CancellationError{
                return
            } catch  {
                let errorMsg = error.localizedDescription
                let chatMessage = ChatMessage(
                    role: .assistant,
                    text:  "Hmm, something went wrong: **\(errorMsg)** Give it another try in a moment. " )
                messages.append(chatMessage)
            }
            isThinking = false
        }
        
    }
    
    func sendSelection(_ values: [String]){
        let text = values.isEmpty ? "None of these" : values.joined(separator: ", ")
        send(text)
        
    }
    
    func startNewConversation(){
        replyTask?.cancel()
        service.resetConversation()
        messages = [ChatMessage(role: .assistant,text: service.greeting().text)]
                    
        input = ""
        isThinking = false
        pendingSelector = nil
    }
    
    func saveItinerary(_ dto: APIItinerary?) async -> Bool {
        guard let dto else { return false }
        
        do {
            try await itineraryService.save(dto)
            messages.append(ChatMessage(role: .assistant, text: "Itinerary is saved successfully"))
            return true
            
        } catch {
            messages.append(ChatMessage(
                role: .assistant, text: "Couldn't save: \(error.localizedDescription)"))
            return false
        }
        
    }

}

#if DEBUG
extension AIPlannerViewModel {
    static var preview: AIPlannerViewModel {
        let vm = AIPlannerViewModel()
        vm.messages = [
            ChatMessage(role: .assistant, text: "Hi — I'm **Offpeak AI**. Tell me about your trip."),
            ChatMessage(role: .user, text: "A long weekend — I love museums and quiet parks."),
            ChatMessage(role: .assistant, text: "Perfect. Do you want each day relaxed, balanced, or packed?"),
            ChatMessage(role: .assistant,
                        text: "Here's your calm route — mornings at the big sights, easier stops after lunch.",
                        itinerary: .preview)
        ]
        return vm
    }
}
#endif
