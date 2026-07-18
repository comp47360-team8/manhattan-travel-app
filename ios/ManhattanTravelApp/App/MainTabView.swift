import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            ExploreView()
                .tabItem {
                    Label("Explore", systemImage: "safari")
                }

            AIPlannerView()
                .tabItem {
                    Label("AI", systemImage: "sparkles")
                }

            ItineraryListView()
                .tabItem {
                    Label("OFFPEAK", systemImage: "calendar")
                }

            SavedView()
                .tabItem {
                    Label("Save", systemImage: "bookmark")
                }

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person.crop.circle.fill")
                }
        }
    }
}

/// Placeholder for tabs outside the scope of the login/logout mockup.
private struct PlaceholderTab: View {
    let title: String
    let systemImage: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: systemImage)
                .font(.system(size: 48))
                .foregroundColor(.blue)
            Text(title)
                .font(.title2.bold())
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthManager())
        .environmentObject(SavedPOIStore())
}
