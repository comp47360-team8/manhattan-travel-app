//
//  POIService.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//
import Foundation

struct POIService {
    let baseURL = APIConfig.baseURL
    
    func fetchPOIs() async throws -> [POI] {
        let url = baseURL.appendingPathComponent("/api/pois")
        
        let data : Data
        let response : URLResponse
        
        do {
            (data, response) = try await URLSession.shared.data(from: url)
        } catch let e as URLError where e.code == .cancelled {
            throw CancellationError()
        } catch {
            throw NetworkError.network         
        }

        
        
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else {
            throw NetworkError.decoding
        }
        
        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        do {
                    return try decoder.decode([POI].self, from: data)
                } catch {
                    throw NetworkError.decoding
                }
    }
    

}

extension POIService {
    func fetchPOI(slug: String) async throws -> POIDetail {
            let url = baseURL.appendingPathComponent("/api/pois/\(slug)")

            let data: Data
            let response: URLResponse
            do {
                (data, response) = try await URLSession.shared.data(from: url)
            } catch {
                throw NetworkError.network
            }
                
            guard let http = response as? HTTPURLResponse else {
                throw NetworkError.decoding
            }
        
            switch http.statusCode {
                case (200..<300): break
                case 404: throw NetworkError.notFound
                case 500: throw NetworkError.serverError
                default: throw NetworkError.network
            }
        
            let decoder = JSONDecoder()
            decoder.keyDecodingStrategy = .convertFromSnakeCase
            do {
                return try decoder.decode(POIDetail.self, from: data)
            } catch {
                throw NetworkError.decoding
            }
        }
}



    
    
