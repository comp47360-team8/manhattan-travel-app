import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var savedStore: SavedPOIStore
    
    var body: some View {
            MainTabView()
            .sheet(isPresented: $authManager.isPresentingLogin){
                LoginView()
        }
            .onChange(of: authManager.isLoggedIn){ _, loggedIn in
                if !loggedIn {
                    self.savedStore.reset()
                }
            }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager())
        .environmentObject(SavedPOIStore())
}
