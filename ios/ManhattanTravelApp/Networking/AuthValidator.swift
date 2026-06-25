//
//  AuthValidator.swift
//  ManhattanTravelApp
//
//  Created by Sean on 22/06/2026.
//

import Foundation

enum AuthValidator {
    
    //email verification
    static func emailError (_ email: String) -> String? {
        let trimmed = email.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return "Please enter your email."
        }
        if !isEmailValid(email) {
            return "Please enter a valid email."
        }
        return nil
    }
        
    private static func isEmailValid (_ email: String) -> Bool {
        let pattern = #"^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        return email.range(of: pattern, options: .regularExpression) != nil
        }
    
    //username
    static func usernameError (_ username: String) -> String? {
        let trimmed = username.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty {
            return "Please enter a username."
        }
        return nil
    }
    
    //Password
    static func passwordError (_ password: String) -> String? {
        if password.isEmpty {
            return "Please enter a password."
        }
        
        if password.count < 6 {
            return "Password must be at least 6 characters."
        }
        
        if password.count > 128 {
            return "Password must be at most 128 characters."
        }
        
        return nil
        
    }
    
    //comfirm password
    static func confirmPasswordError (password: String, confirmPassword: String) -> String? {
        if confirmPassword.isEmpty {
            return "Please confirm your password."
        }
        if password != confirmPassword {
            return "Passwords do not match."
        }
        return nil
    }
}
    

