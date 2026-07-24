import Foundation

/// Mock authentication state for the mobile UI mockup.
/// No network calls are made — `login` accepts any well-formed credentials
/// and `logout` simply clears the session. Swap this out for a real
/// backend-backed implementation once the auth API is available.
@MainActor
final class AuthManager: ObservableObject {
    @Published var isPresentingLogin: Bool = false
    @Published var startOnRegister: Bool = false
    @Published var isRegistering: Bool = false
    @Published var isLoggingIn: Bool = false
    @Published var isLoggedIn: Bool
    @Published var currentUser: User?
    @Published var emailError: String?
    @Published var passwordError: String?
    @Published var generalError: String?
    @Published var usernameError: String?
    @Published var confirmPasswordError: String?

    private let authService = AuthService()

    static let mockUser = User(
        name: "Amelia Chen",
        email: "amelia.chen@example.com",
        joinedDate: "Joined March 2026",
        isPro: true,
        tripsCount: 3,
        placesCount: 27,
        offPeakPercentage: 94
    )

    // Persisted identity so the profile survives app restarts.
    // The backend has no /me endpoint, so we keep the name/email we already know.
    private static let nameKey  = "profile.displayName"
    private static let emailKey = "profile.email"

    private static func makeUser(name: String, email: String) -> User {
        // joinedDate intentionally empty — backend doesn't provide it (hidden in the UI).
        User(name: name, email: email, joinedDate: "",
             isPro: false, tripsCount: 0, placesCount: 0, offPeakPercentage: 0)
    }

    private static func displayName(fromEmail email: String) -> String {
        let local = email.split(separator: "@").first.map(String.init) ?? email
        guard let first = local.first else { return email }
        return first.uppercased() + local.dropFirst()
    }

    private static func persistProfile(name: String, email: String) {
        UserDefaults.standard.set(name, forKey: nameKey)
        UserDefaults.standard.set(email, forKey: emailKey)
    }

    private static func clearProfile() {
        UserDefaults.standard.removeObject(forKey: nameKey)
        UserDefaults.standard.removeObject(forKey: emailKey)
    }

    private static func restoredUser() -> User {
        let email = UserDefaults.standard.string(forKey: emailKey) ?? ""
        let name  = UserDefaults.standard.string(forKey: nameKey) ?? displayName(fromEmail: email)
        return makeUser(name: name, email: email)
    }

    init() {
        let hasSession = TokenStore.refreshToken != nil
        self.isLoggedIn = hasSession
        self.currentUser = hasSession ? AuthManager.restoredUser() : nil

        NotificationCenter.default.addObserver(forName: .authSessionExpired, object: nil, queue: .main) { [weak self] _ in
            Task { @MainActor in self?.handleSessionExpired() }
        }
    }

    func handleSessionExpired() {
        currentUser = nil
        isLoggedIn = false
        isPresentingLogin = true
    }


    // Login check
    func login(email: String, password: String) async {
        // sync
        emailError = AuthValidator.emailError(email)
        passwordError = AuthValidator.passwordError(password)
        generalError = nil
        guard emailError == nil, passwordError == nil else { return }

        isLoggingIn = true
        defer { isLoggingIn = false }
        // asyn
        do {
            let tokens = try await authService.login(LoginRequest(email: email, password: password))
            TokenStore.save(access: tokens.accessToken, refresh: tokens.refreshToken)

            let name = tokens.displayName
            AuthManager.persistProfile(name: name, email: email)
            currentUser = AuthManager.makeUser(name: name, email: email)
            isLoggedIn = true
            isPresentingLogin = false

        }catch{
            generalError = error.localizedDescription
        }
    }
    
    func register(email: String, userName: String, password: String, confirmPassword: String) async {
        
        emailError = AuthValidator.emailError(email)
        passwordError = AuthValidator.passwordError(password)
        usernameError = AuthValidator.usernameError(userName)
        confirmPasswordError = AuthValidator.confirmPasswordError(
            password: password,
            confirmPassword: confirmPassword
        )
        generalError = nil
        
        guard emailError == nil, usernameError == nil,
                  passwordError == nil, confirmPasswordError == nil else { return }

        isRegistering = true
        defer { isRegistering = false }
        do{
            _ = try await authService.signup(SignUpRequest(email: email, displayName: userName, password: password, confirmPassword: confirmPassword))
            let tokens = try await authService.login(LoginRequest(email: email, password: password))
            TokenStore.save(access: tokens.accessToken, refresh: tokens.refreshToken)
            AuthManager.persistProfile(name: userName, email: email)
            currentUser = AuthManager.makeUser(name: userName, email: email)
            isLoggedIn = true
            isPresentingLogin = false
            
        } catch let error as NetworkError {
            if case .http(let status, let detail) = error, status == 409 {
                emailError = detail
            }else{
                generalError = error.localizedDescription
            }
        }catch{
            generalError = error.localizedDescription
        }
    }

    func logout() async{
        if let refresh = TokenStore.refreshToken {
            do {
                _ = try await authService.logout(LogoutRequest(refreshToken: refresh))
            } catch {
                //
            }
        }
        TokenStore.clear()
        AuthManager.clearProfile()
        currentUser = nil
        isLoggedIn = false
        clearErrors()
        
    }
    
    func clearErrors() {
        emailError = nil
        usernameError = nil
        passwordError = nil
        confirmPasswordError = nil
        generalError = nil
    }
    
    func requireLogin(register: Bool = false) {
        startOnRegister = register
        isPresentingLogin = true
    }

}

extension AuthManager {
    /// Preconfigured manager for SwiftUI previews (bypasses the network call).
    static func previewing(loggingIn: Bool = false, registering: Bool = false) -> AuthManager {
        let manager = AuthManager()
        manager.isLoggingIn = loggingIn
        manager.isRegistering = registering
        return manager
    }
}
