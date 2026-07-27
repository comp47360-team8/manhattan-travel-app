//
//  AIModels.swift


import SwiftUI

/// Who authored a chat message.
enum ChatRole {
    case user
    case assistant
}

struct ChatMessage: Identifiable {
    let id = UUID()
    let role: ChatRole
    let text: String
    var itinerary: OptimizedItinerary? = nil
    var rawItinerary: APIItinerary? = nil

}

struct CreateConversationResponse: Decodable{
    let conversationId: String
}

struct ChatRequestDTO: Encodable{
    let prompt: String
}

struct ChatResponseDTO: Decodable{
    let message: String
    let uiAction: UIActionDTO?
    let itinerary: APIItinerary?
}

struct UIActionDTO: Decodable, Equatable{
    let component: String
    let field: String
    let selection: String
    let options: [UIOptionDTO]
}

struct UIOptionDTO: Decodable, Identifiable, Equatable{
    let label: String
    let value: String
    
    var id: String {value}
   
}
