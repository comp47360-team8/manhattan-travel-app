//
//  POISelectorRow.swift
//  ManhattanTravelApp
//
//  Created by Sean on 21/07/2026.
//

import SwiftUI

struct POISelectorRow: View {
    let action: UIActionDTO
    let onConfirm: ([String]) -> Void
    @State private var selected: Set<String> = []

    var body: some View {
        VStack(spacing: 10){
            
            ScrollView(.horizontal, showsIndicators: false){
                HStack(spacing: 8){
                    ForEach(action.options){ option in
                        Button {
                            if selected.contains(option.value){
                                selected.remove(option.value)
                            } else {
                                selected.insert(option.value)
                            }
                        }label: {
                            chipLabel(option.label, isOn: selected.contains(option.value))
                        }
                        .buttonStyle(.plain)
                    }
                }
                
            }
            .padding(.horizontal, 16)
            
                
            Button { onConfirm(Array(selected)) } label: {
                    Text(selected.isEmpty ? "None of these" : "Confirm (\(selected.count))")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity).frame(height: 46)
                    .background(OffpeakTheme.brand, in: Capsule())
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 6)
            
            
            
            
    }
        

   
    private func chipLabel(_ text: String, isOn: Bool) -> some View {
        Text(text)
            .font(.system(size: 14, weight: .semibold))
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)
            .foregroundColor(isOn ? .white : OffpeakTheme.brand)
            .padding(.horizontal, 16).padding(.vertical, 10)
            .background(isOn ? OffpeakTheme.brand : Color.white.opacity(0.85), in: Capsule())
            .overlay(Capsule().stroke(OffpeakTheme.brand.opacity(0.35), lineWidth: 1))
    }
}



#Preview("Selector") {
    POISelectorRow(
        action: UIActionDTO(
            component: "poi_type_selector",
            field: "preferences",
            selection: "multiple",
            options: [
                UIOptionDTO(label: "Museums", value: "museum"),
                UIOptionDTO(label: "Parks", value: "park"),
                UIOptionDTO(label: "Food & Markets", value: "food"),
                UIOptionDTO(label: "Landmarks", value: "landmark")
            ]
        ),
        onConfirm: { print($0) }
    )
    .padding()
}
