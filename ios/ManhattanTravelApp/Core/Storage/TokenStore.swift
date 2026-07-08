//
//  TokenStore.swift
//  ManhattanTravelApp
//
//  Created by Sean on 23/06/2026.
//

import Foundation
import Security

enum TokenStore {
    private static let service = "com.offpeak.auth"
    private static let accessKey = "access_token"
    private static let refreshKey = "refresh_token"
    
    // save - set
    static func save(access: String, refresh: String){
        write(accessKey, access)
        write(refreshKey, refresh)
    }
 
    // read - get (may return nil)
    static var accessToken: String? {
        read(accessKey)
    }
    static var refreshToken: String? {
        read(refreshKey)
    }
    
    // clear
    static func clear() {
        remove(accessKey)
        remove(refreshKey)
    }
    
    
    // set
    private static func write(_ key: String, _ value: String) {
        let data = Data(value.utf8)
        
        remove(key)
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        SecItemAdd(query as CFDictionary, nil)
            
        
    }
    
    // get
    static func read(_ key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
        
    }
    
    // delete
    static func remove(_ key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
        SecItemDelete(query as CFDictionary)
    }

}
