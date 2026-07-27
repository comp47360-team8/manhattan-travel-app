//
//  AIPlannerService.swift

import Foundation

struct AIReply{
    let text: String
    var uiAction: UIActionDTO? = nil
    var itinerary: OptimizedItinerary? = nil
    var rawItinerary: APIItinerary? = nil
}

protocol AIPlannerServing {
    func greeting() -> AIReply
    func reply(to userMessage: String) async throws -> AIReply
    func resetConversation()
}

final class AIPlannerService: AIPlannerServing {
    private let api = APIClient.shared
    private var conversationId: String?
    
    func greeting() -> AIReply {
        AIReply(
            text: "Hi, I'm **Offpeak AI Planner**. I turn your trip into a crowd-smart, day-by-day plan. What are your dates, pace, and interests — and anything to avoid?")
    }
    
    func reply(to userMessage: String) async throws -> AIReply{
        let convId = try await ensureConversation()
        
        let dto: ChatResponseDTO = try await api.post(
            "/api/ai/converstions/\(convId)/messages",
            body: ChatRequestDTO(prompt: userMessage),
            authenticated: true
        )
        
        var reply = AIReply(
            text: dto.message
        )
        
        
        reply.uiAction = dto.uiAction
        
        
        if let itinerary = dto.itinerary {
            reply.rawItinerary = itinerary
            reply.itinerary = OptimizedItinerary.from(
                itinerary,
                startDate: Self.startDate(from: itinerary.startDate))
        }
        
        return reply
        
    }
    
    
    private func ensureConversation() async throws -> String {
        if let conversationId {
            return conversationId
        } else {
            let result: CreateConversationResponse = try await api.post(
                "/api/ai/conversations",
                body: EmptyBody?.none,
                authenticated: true)
            conversationId = result.conversationId
            return result.conversationId
        }
        
        
    }
    
    private static func startDate(from isoDate: String) -> Date {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyy-MM-dd"
        return f.date(from: isoDate) ?? .now
    }
    
    func resetConversation() {
        conversationId = nil
    }

    
    
}

