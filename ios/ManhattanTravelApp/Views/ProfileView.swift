import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var showLogoutConfirmation = false

    private var user: User {
        authManager.currentUser ?? AuthManager.mockUser
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text("Profile")
                    .font(.system(size: 36, weight: .bold))
                    .padding(.top, 8)

                profileCard
                statsRow
                settingsList
                logoutButton
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .background(Color(.systemGroupedBackground))
        .confirmationDialog(
            "Are you sure you want to log out?",
            isPresented: $showLogoutConfirmation,
            titleVisibility: .visible
        ) {
            Button("Log Out", role: .destructive) {
                authManager.logout()
            }
            Button("Cancel", role: .cancel) {}
        }
    }

    private var profileCard: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .fill(Color(.systemGray5))
                    .frame(width: 64, height: 64)
                Image(systemName: "person.fill")
                    .font(.system(size: 28))
                    .foregroundColor(.gray)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(user.name)
                    .font(.title3.bold())
                Text(user.joinedDate)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            if user.isPro {
                Text("Pro")
                    .font(.subheadline.bold())
                    .foregroundColor(.blue)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.15))
                    .clipShape(Capsule())
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(20)
    }

    private var statsRow: some View {
        HStack(spacing: 12) {
            statCard(value: "\(user.tripsCount)", label: "Trips")
            statCard(value: "\(user.placesCount)", label: "Places")
            statCard(value: "\(user.offPeakPercentage)%", label: "Off-peak")
        }
    }

    private func statCard(value: String, label: String) -> some View {
        VStack(spacing: 6) {
            Text(value)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(.blue)
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
    }

    private var settingsList: some View {
        VStack(spacing: 0) {
            settingsRow(icon: "bell.fill", title: "Notifications", value: "On")
            Divider().padding(.leading, 60)
            settingsRow(icon: "figure.roll", title: "Accessibility", value: "Step-free")
            Divider().padding(.leading, 60)
            settingsRow(icon: "gearshape.fill", title: "Preferences", value: nil)
            Divider().padding(.leading, 60)
            settingsRow(icon: "sparkles", title: "AI suggestions", value: "Personalized")
        }
        .background(Color(.systemBackground))
        .cornerRadius(20)
    }

    private func settingsRow(icon: String, title: String, value: String?) -> some View {
        HStack {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(Color.blue.opacity(0.12))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .foregroundColor(.blue)
            }
            Text(title)
                .font(.body.weight(.medium))
            Spacer()
            if let value {
                Text(value)
                    .foregroundColor(.secondary)
            }
            Image(systemName: "chevron.right")
                .font(.footnote)
                .foregroundColor(Color(.systemGray3))
        }
        .padding(.vertical, 14)
        .padding(.horizontal, 16)
        .contentShape(Rectangle())
    }

    private var logoutButton: some View {
        Button {
            showLogoutConfirmation = true
        } label: {
            Text("Log Out")
                .font(.headline)
                .foregroundColor(.red)
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemBackground))
                .cornerRadius(16)
        }
        .padding(.top, 8)
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager())
}
