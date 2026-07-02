import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authManager: AuthManager
    
    var body: some View {
        Group {
            MainTabView()
                .sheet(isPresented: Binding(
                    get: { !authManager.isLoggedIn },
                    set: { _ in }
                )) {
                    LoginView()
                }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthManager())
}
