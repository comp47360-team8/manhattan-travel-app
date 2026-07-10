import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutConfirmation = false
    @AppStorage("stepFreeRoutesEnabled") private var stepFreeRoutesEnabled = true

    private var user: User {
        authManager.currentUser ?? AuthManager.mockUser
    }

    var body: some View {
        Group {
            if authManager.isLoggedIn {
                loggedInContent
            } else {
                LoggedOutPrompt(
                    icon: "person",
                    title: "Sign in to Offpeak",
                    message: "Save places, plan trips, and enable step-free routes — all synced to your account.",
                    showCreateButton: true
                )
            }
        }
        .background(OffpeakTheme.backGround)
        .alert("Log out?", isPresented: $showLogoutConfirmation) {
            Button("Log Out", role: .destructive) {
                Task { await authManager.logout() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("You'll need to sign in again to see your trips and saved places.")
        }
    }

    private var loggedInContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text("Profile")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(OffpeakTheme.inkTitle)
                    .padding(.top, 8)

                profileCard
                accessibilityCard
                logoutButton
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
    }

    private var profileCard: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color(.systemGray5))
                    .frame(width: 60, height: 60)
                Image(systemName: "person.fill")
                    .font(.system(size: 26))
                    .foregroundColor(.gray)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.title3.bold())
                    .foregroundColor(OffpeakTheme.inkTitle)
                if !user.joinedDate.isEmpty {
                    Text(user.joinedDate)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            Spacer()
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(20)
    }

    private var accessibilityCard: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(OffpeakTheme.brand.opacity(0.12))
                    .frame(width: 44, height: 44)
                Image(systemName: "figure.roll")
                    .font(.system(size: 20))
                    .foregroundColor(OffpeakTheme.brand)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Accessibility")
                    .font(.body.weight(.semibold))
                    .foregroundColor(OffpeakTheme.inkTitle)
                Text("Step-free routes enabled")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Toggle("", isOn: $stepFreeRoutesEnabled)
                .labelsHidden()
                .tint(OffpeakTheme.brand)
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(20)
    }

    private var logoutButton: some View {
        Button {
            showLogoutConfirmation = true
        } label: {
            HStack(spacing: 14) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(OffpeakTheme.brand.opacity(0.12))
                        .frame(width: 44, height: 44)
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.system(size: 20))
                        .foregroundColor(OffpeakTheme.brand)
                }
                Text("Log out")
                    .font(.body.weight(.semibold))
                    .foregroundColor(OffpeakTheme.brand)
                Spacer()
            }
            .padding(16)
            .background(Color(.systemBackground))
            .cornerRadius(20)
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager())
}
