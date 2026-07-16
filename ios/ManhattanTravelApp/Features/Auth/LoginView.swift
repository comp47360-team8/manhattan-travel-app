import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var email: String = ""
    @State private var password: String = ""
    
    @State private var isPasswordVisible: Bool = false
    @State private var showRegister: Bool = false
    
    var body: some View {
        
        VStack(spacing: 10) {
            Spacer()
            header
            form
            Spacer()
        }
        .padding(.vertical, 20)
        .padding(.horizontal, 10)
        .background(OffpeakTheme.backGround)
        .presentationDetents([.medium])
        .presentationDragIndicator(.hidden)
        //.interactiveDismissDisabled()
        .onAppear{
            authManager.clearErrors()
            if authManager.startOnRegister {
                authManager.startOnRegister = false
                showRegister = true
            }
        }
        .fullScreenCover(isPresented: $showRegister){
            RegisterView()
                .environmentObject(authManager)
        }
        
    }

    private var header: some View {
        HStack(alignment: .top){
            VStack(alignment: .leading, spacing: 4) {
                        Text("WELCOME BACK")
                            .font(.caption.bold())
                            .foregroundColor(.secondary)
                        Text("Log in to Offpeak")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(OffpeakTheme.inkTitle)
            }
            Spacer()
            Button{
                authManager.isPresentingLogin = false
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 12, weight: .bold))
                    .padding(10)
                    .background(.ultraThinMaterial)
                    .clipShape(Circle())
            }
            .glassEffect(in: Circle())
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 20)
        
    }

    private var form: some View {
        VStack(alignment: .leading, spacing: 8) {
            //email
            LabeledField(title: "Email", errorMessage: authManager.emailError ) {
                TextField("you@example.com", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .foregroundStyle(.primary)
                }
            
            
            //password
            LabeledField(title: "Password", errorMessage: authManager.passwordError ) {
                HStack {
                    Group {
                        if isPasswordVisible {
                            TextField("••••••••", text: $password)
                        } else {
                            SecureField("••••••••", text: $password)
                        }
                    }
                    
                    Button {
                        isPasswordVisible.toggle()
                    } label: {
                        Image(systemName: isPasswordVisible ? "eye" :  "eye.slash")
                            .frame(width: 22, height: 22)
                            .foregroundColor(.gray)
                    }
                }
            }
            

            //Error return from backend
            if let errorMessage = authManager.generalError {
                Text(errorMessage)
                    .font(.footnote)
                    .foregroundColor(.red)
            }else{
                Text("")
            }
            
            // Forgot password
            Button("Forgot Password?"){
                //TBF
            }
            .font(.footnote)
            .bold()
            .foregroundColor(OffpeakTheme.brand)
            .frame(maxWidth: .infinity, alignment: .trailing)

            // Login Botton
            Button(action: {
                Task {await authManager.login(email: email, password: password)}
            }) {
                Group {
                    if authManager.isLoggingIn {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text("Log In")
                            .font(.headline)
                            .foregroundColor(.white)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(OffpeakTheme.brand)
                .cornerRadius(14)
            }
            .disabled(authManager.isLoggingIn)
            
            HStack(spacing: 4){
                Text("Don't have an account?")
                    .foregroundColor(.secondary)
                Button("Sign Up"){
                    showRegister = true
                }
                .bold()
                .foregroundColor(OffpeakTheme.brand)
            }
            .font(.footnote)
            .frame(maxWidth: .infinity, alignment: .center)

//            Text("Mock sign-in — any email and a 6+ character password works")
//                .font(.caption)
//                .foregroundColor(.secondary)
//                .frame(maxWidth: .infinity, alignment: .center)
        }
        .padding(.horizontal, 10)
    }

}

#Preview("Login") {
    Color(.systemGroupedBackground)
           .ignoresSafeArea()
           .sheet(isPresented: .constant(true)) {
               LoginView()
                   .environmentObject(AuthManager())
           }
}

#Preview("Login loading") {
    Color(.systemGroupedBackground)
        .ignoresSafeArea()
        .sheet(isPresented: .constant(true)) {
            LoginView()
                .environmentObject(AuthManager.previewing(loggingIn: true))
        }
}
