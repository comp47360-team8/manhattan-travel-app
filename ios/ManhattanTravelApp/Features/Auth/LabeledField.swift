//
//  LabeledField.swift
//  ManhattanTravelApp
//
//  Created by Sean on 18/06/2026.
//

import SwiftUI

struct LabeledField<Content: View>: View {
    
    let title: String
    //var isError: Bool = false
    var errorMessage: String? = nil
    
    @ViewBuilder let content: () -> Content

        var body: some View {
            VStack(alignment: .leading, spacing: 6) {
                Text(title.uppercased())
                    .font(.caption.bold())
                    .tracking(1)
                    .foregroundStyle(.secondary)
                content()
                    .padding()
                    .background(Color(.systemBackground))
                    .cornerRadius(12)
                    .shadow(color: .black.opacity(0.06), radius: 12, x: 0, y: 6)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(errorMessage != nil ? Color.red : Color.clear, lineWidth: 1.5)
                    )
                
                Text(errorMessage ?? "")
                    .font(.caption)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity, minHeight: 16, alignment: .leading)
                    .opacity(errorMessage == nil ? 0 : 1)
                    .animation(.default, value: errorMessage)
                
              
            }
        }
    
    
}


#Preview {
    VStack(spacing: 24) {
        LabeledField(title: "Email") {
            TextField("you@example.com", text: .constant(""))
        }

        LabeledField(title: "Password", errorMessage: nil) {
            SecureField("••••••", text: .constant("123"))
        }

        LabeledField(title: "Notes") {
            Text("Off-peak window: 7–9 AM")
        }
    }
    .padding()
}
