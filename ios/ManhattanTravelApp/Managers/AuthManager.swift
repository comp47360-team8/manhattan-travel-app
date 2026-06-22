import Foundation

/// Mock authentication state for the mobile UI mockup.
/// No network calls are made — `login` accepts any well-formed credentials
/// and `logout` simply clears the session. Swap this out for a real
/// backend-backed implementation once the auth API is available.
@MainActor
final class AuthManager: ObservableObject {
    @Published var isLoggedIn: Bool
    @Published var currentUser: User?
    @Published var emailError: String?
    @Published var passwordError: String?
    @Published var generalError: String?

    private let isLoggedInKey = "auth.isLoggedIn"

    static let mockUser = User(
        name: "Amelia Chen",
        email: "amelia.chen@example.com",
        joinedDate: "Joined March 2026",
        isPro: true,
        tripsCount: 3,
        placesCount: 27,
        offPeakPercentage: 94
    )

    init() {
        let storedLoginState = UserDefaults.standard.bool(forKey: isLoggedInKey)
        self.isLoggedIn = storedLoginState
        self.currentUser = storedLoginState ? AuthManager.mockUser : nil
    }
    // Login check
    func login(email: String, password: String) {
        emailError = nil
        passwordError = nil
        generalError = nil
        
        //email check
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if trimmedEmail.isEmpty {
            emailError = "Please enter your email."
        }else if !trimmedEmail.contains("@"){
            emailError = "Please enter a valid email address."
        }
        
        //password check
        if password.isEmpty {
            passwordError = "Please enter your password."
        }else if password.count < 8 {
            passwordError = "Password must be at least 8 characters."
        }
        
        guard emailError == nil, passwordError == nil else {
            return
        }
        
        
        currentUser = AuthManager.mockUser
        isLoggedIn = true
        UserDefaults.standard.set(true, forKey: isLoggedInKey)
    }
    
    func register(){
        
    }

    func logout() {
        currentUser = nil
        isLoggedIn = false
        emailError = nil
        passwordError = nil
        generalError = nil
        UserDefaults.standard.set(false, forKey: isLoggedInKey)
    }
}
