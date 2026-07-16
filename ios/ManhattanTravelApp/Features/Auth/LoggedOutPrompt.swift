//
//  LoggedOutPrompt.swift
//  ManhattanTravelApp
//
//  Shared logged-out empty state for tabs that require an account
//  (Itinerary, Saved, Profile).
//

import SwiftUI

struct LoggedOutPrompt: View {
    let icon: String
    let title: String
    let message: String
    /// When true, shows a solid "Create an account" button below "Log in"
    /// instead of the "New here? Create an account" text link.
    var showCreateButton: Bool = false

    @EnvironmentObject var authManager: AuthManager

    var body: some View {
        VStack(spacing: 0) {
            Spacer()

            iconTile
                .padding(.bottom, 24)

            Text(title)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(OffpeakTheme.inkTitle)
                .padding(.bottom, 10)

            Text(message)
                .font(.system(size: 15))
                .foregroundColor(OffpeakTheme.textSecondary)
                .multilineTextAlignment(.center)
                .lineSpacing(2)
                .padding(.horizontal, 44)
                .padding(.bottom, 28)

            loginButton

            if showCreateButton {
                createAccountButton
                    .padding(.top, 12)
            } else {
                createAccountLink
                    .padding(.top, 14)
            }

            Spacer()
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 40)
    }

    private var iconTile: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color(.systemBackground))
                .frame(width: 76, height: 76)
                .shadow(color: .black.opacity(0.08), radius: 16, x: 0, y: 8)
            Image(systemName: icon)
                .font(.system(size: 30))
                .foregroundColor(OffpeakTheme.brand)
        }
    }

    private var loginButton: some View {
        Button {
            authManager.requireLogin()
        } label: {
            Text("Log in")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(OffpeakTheme.brand, in: Capsule())
        }
    }

    private var createAccountButton: some View {
        Button {
            authManager.requireLogin(register: true)
        } label: {
            Text("Create an account")
                .font(.system(size: 16, weight: .semibold))
                .foregroundColor(OffpeakTheme.inkTitle)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .background(Color(.systemBackground), in: Capsule())
        }
    }

    private var createAccountLink: some View {
        HStack(spacing: 4) {
            Text("New here?")
                .foregroundColor(OffpeakTheme.textSecondary)
            Button("Create an account") {
                authManager.requireLogin(register: true)
            }
            .fontWeight(.bold)
            .foregroundColor(OffpeakTheme.brand)
        }
        .font(.system(size: 14))
    }
}

#Preview {
    LoggedOutPrompt(
        icon: "person",
        title: "Sign in to Offpeak",
        message: "Save places, plan trips, and enable step-free routes — all synced to your account.",
        showCreateButton: true
    )
    .background(OffpeakTheme.backGround)
    .environmentObject(AuthManager())
}
