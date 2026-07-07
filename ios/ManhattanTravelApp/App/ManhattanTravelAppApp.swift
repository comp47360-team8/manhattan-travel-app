import SwiftUI

@main
struct ManhattanTravelAppApp: App {
    @StateObject private var authManager = AuthManager()
    @StateObject private var savedStore = SavedPOIStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authManager)
                .environmentObject(savedStore)
                
        }
    }
}
