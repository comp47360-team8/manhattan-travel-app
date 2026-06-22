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
    @Published var usernameError: String?
    @Published var confirmPasswordError: String?

    private let isLoggedInKey = "auth.isLoggedIn"
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

    init() {
        let storedLoginState = UserDefaults.standard.bool(forKey: isLoggedInKey)
        self.isLoggedIn = storedLoginState
        self.currentUser = storedLoginState ? AuthManager.mockUser : nil
    }
    // Login check
    func login(email: String, password: String) async {
        
        // sync
        emailError = AuthValidator.emailError(email)
        passwordError = AuthValidator.passwordError(password)
        generalError = nil
        guard emailError == nil, passwordError == nil else { return }
        
        // asyn
        do {
            let tokens = try await authService.login(LoginRequest(email: email, password: password))
            print("access:", tokens.accessToken)
            currentUser = AuthManager.mockUser
            isLoggedIn = true
            UserDefaults.standard.set(true, forKey: isLoggedInKey)
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

        
        do{
            _ = try await authService.signup(SignUpRequest(email: email, displayName: userName, password: password, confirmPassword: confirmPassword))
            let tokens = try await authService.login(LoginRequest(email: email, password: password))
            print("access:", tokens.accessToken)
            currentUser = AuthManager.mockUser
            isLoggedIn = true
            UserDefaults.standard.set(true, forKey: isLoggedInKey)
        } catch let error as AuthError {
            if case .http(let status, let detail) = error, status == 409 {
                emailError = detail
            }else{
                generalError = error.localizedDescription
            }
        }catch{
            generalError = error.localizedDescription
        }
    }

    func logout() {
        currentUser = nil
        isLoggedIn = false
        emailError = nil
        passwordError = nil
        generalError = nil
        UserDefaults.standard.set(false, forKey: isLoggedInKey)
    }
    
    func clearErrors() {
        emailError = nil
        usernameError = nil
        passwordError = nil
        confirmPasswordError = nil
        generalError = nil
    }

}
