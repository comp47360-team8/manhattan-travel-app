//
//  RegisterView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 15/06/2026.
//
import SwiftUI


struct RegisterView: View {
    @EnvironmentObject var authManager: AuthManager
    @Environment(\.dismiss) var dismiss
    @State private var username: String = ""
    @State private var email: String = ""
    @State private var password: String = ""
    @State private var confirmPassword: String = ""
    @State private var isPasswordVisible: Bool = false
    @State private var isConfirmVisible: Bool = false
    
    
    var body: some View {
        
            VStack{
                topBar
                    .padding(.horizontal, 20)
                ScrollView{
                    VStack(alignment: .leading, spacing: 16) {
                        header
                        form
                        signUpButton
                        footer
                    }
                    .padding(.horizontal, 20)
                }
            }
            
            .padding(.vertical, 10)
            .background(OffpeakTheme.backGround)
            .onAppear{
                authManager.clearErrors()
            }
    }
        
    
    
    private var topBar: some View {
        HStack(spacing: 12){
            Button{
                dismiss()
            } label :{
                Image(systemName: "chevron.left")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.primary)
                    .padding(12)
            }
            .glassEffect(.clear.interactive(),
                         in: Circle())
            
            
            Text("Create account")
                .font(.title3.bold())
            Spacer()
        }
        
    }
    
    private var header: some View {
        VStack(alignment: .leading, spacing: 6){
            Text("JOIN OFFPEAK")
                .font(.caption.bold())
                .tracking(2)
                .foregroundColor(.secondary)
            Text("Plan smarter, \nexplore calmer.")
                .font(.system(size: 32, weight: .bold))
                .foregroundColor(OffpeakTheme.inkTitle)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 8)
        
    }
    
    private var form: some View {
        VStack(alignment: .leading, spacing: 8){
            //Email
            LabeledField(title: "Email", errorMessage: authManager.emailError){
                TextField("you@example.com", text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
            }
            
            LabeledField(title: "Username", errorMessage: authManager.usernameError){
                TextField("What should we call you?", text: $username)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
            }
            
            //Password
            LabeledField(title: "Password", errorMessage: authManager.passwordError){
                HStack{
                    Group{
                        if isPasswordVisible{
                            TextField("At least 6 characters", text: $password)
                        } else{
                            SecureField("At least 6 characters", text: $password)
                        }
                    }
                    Button{
                        isPasswordVisible.toggle()
                    }label:{
                        Image(systemName: isPasswordVisible ? "eye" : "eye.slash" )
                            .foregroundColor(.gray)
                            .frame(width: 22, height: 22)
                    }
                }
            }
            
            //Confirm your password
            LabeledField(title: "Confirm password", errorMessage: authManager.confirmPasswordError){
                HStack{
                    Group{
                        if isConfirmVisible{
                            TextField("Re-enter your password", text: $confirmPassword)
                        } else{
                            SecureField("Re-enter your password", text: $confirmPassword)
                        }
                    }
                    Button{
                        isConfirmVisible.toggle()
                    }label:{
                        Image(systemName: isConfirmVisible ? "eye" : "eye.slash")
                            .foregroundColor(.gray)
                            .frame(width: 22, height: 22)
                    }
                }
                
            }
        }
    }
    //Sign Up Button
    private var signUpButton: some View{
        Button{
            Task {
                await authManager.register(
                    email: email,
                    userName: username,
                    password: password,
                    confirmPassword: confirmPassword)
            }
        } label:{
            Group {
                if authManager.isRegistering {
                    ProgressView()
                        .tint(.white)
                } else {
                    Text("Sign up & Log in")
                        .font(.headline)
                        .foregroundColor(.white)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(OffpeakTheme.brand)
            .cornerRadius(14)
        }
        .disabled(authManager.isRegistering)
        .padding(.top, 8)
    }
        
        
    //Footer
    private var footer: some View{
        HStack(spacing: 4){
            Text("Already have an account?")
                .foregroundColor(.secondary)
            Button("Log in"){
                dismiss()
            }
            .bold()
            .foregroundColor(OffpeakTheme.brand)
        }
        .font(.footnote)
        .frame(maxWidth: .infinity, alignment: .center)
    }
        

    
}
#Preview("Register") {
    RegisterView()
        .environmentObject(AuthManager())
}

#Preview("Register loading") {
    RegisterView()
        .environmentObject(AuthManager.previewing(registering: true))
}
