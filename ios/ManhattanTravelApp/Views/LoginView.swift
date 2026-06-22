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
        .background(Color(.systemGroupedBackground).opacity(0.8)) // the background?
        .presentationDetents([.medium])
        .presentationDragIndicator(.hidden)
        .interactiveDismissDisabled()
        .onAppear{
            authManager.clearErrors()
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
                        Text("Log in to OFFPEAK")
                            .font(.system(size: 26, weight: .bold))
                            .foregroundColor(Color(red: 0.1, green: 0.18, blue: 0.32))
            }
            Spacer()
            Button{
              // To be provided
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
            .foregroundColor(Color(red: 0.78, green: 0.25, blue: 0.18))
            .frame(maxWidth: .infinity, alignment: .trailing)
            
            // Login Botton
            Button(action: {
                Task {await authManager.login(email: email, password: password)}
            }) {
                Text("Log In")
                    .font(.headline)
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(red: 0.1, green: 0.18, blue: 0.32))
                    .cornerRadius(14)
            }
            
            HStack(spacing: 4){
                Text("Don't have an account?")
                    .foregroundColor(.secondary)
                Button("Sign Up"){
                    showRegister = true
                }
                .bold()
                .foregroundColor(Color(red: 0.78, green: 0.25, blue: 0.18))
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

#Preview {
    Color(.systemGroupedBackground)
           .ignoresSafeArea()
           .sheet(isPresented: .constant(true)) {
               LoginView()
                   .environmentObject(AuthManager())
           }
}
