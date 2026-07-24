//
//  ExploreView.swift
//  ManhattanTravelApp
//
//  Created by Sean on 25/06/2026.
//

import SwiftUI


struct ExploreView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var savedStore : SavedPOIStore
    @StateObject private var viewModel = ExploreViewModel()
    @State private var searchText = ""
    @State private var selectedCategory: POICategory = .all
    @State private var accessFilter: Access? = nil
    
    private let accessOptions: [Access?] = [nil, .full, .partial]

    private var filteredPOIs: [POI] {
        var result = viewModel.pois
        
        // accessibility
        if let accessFilter {
            result = result.filter{ $0.access == accessFilter }
        }
        
        // Category
        if selectedCategory != .all {
            result = result.filter{ $0.type == selectedCategory.rawValue }
        }
        
        // search
        let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
        if !query.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(query) || ($0.neighborhood?.localizedCaseInsensitiveContains(query) ?? false)
            }
        }
        return result
    }
        

    var body: some View {
        NavigationStack {
            ScrollView {
                content
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 32)
            }
            .refreshable {
                await viewModel.loadPOIs(force: true)
            }
            .background(OffpeakTheme.backGround)
            .safeAreaInset(edge: .top, spacing: 0) { topBar }
            .navigationDestination(for: String.self) { slug in
                POIDetailView(
                    slug: slug,
                    isSaved: savedStore.isSaved(slug: slug)
                    
                )
            }
            .task {
                await viewModel.loadPOIs()
                if authManager.isLoggedIn { await savedStore.load() }
            }
        }
    }

    private var topBar: some View {
        VStack(alignment: .leading, spacing: 16) {
            header
            searchBar
            filterChips
        }
        .padding(.horizontal, 20)
        .padding(.top, 6)
        .padding(.bottom, 12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            Rectangle()
                .fill(.ultraThinMaterial)
                .mask(
                    LinearGradient(
                        colors: [.black, .black, .black.opacity(0.5), .black.opacity(0)],
                        startPoint: .top, endPoint: .bottom)
                )
                .ignoresSafeArea(edges: .top)
        }
    }
    

    // MARK: Header
    private var header: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text("Manhattan · Today")
                .font(.system(size: 11, weight: .bold))
                .tracking(0.8)
                .textCase(.uppercase)
                .foregroundColor(OffpeakTheme.navy)
                .padding(.top, 6)

            Text("Explore")
                .font(.system(size: 32, weight: .bold))
                .kerning(-0.6)
                .foregroundColor(OffpeakTheme.ink)

            Text("Discover Manhattan, calmly")
                .font(.system(size: 14))
                .foregroundColor(OffpeakTheme.textSecondary)
        }
    }

    // MARK: Search
    private var searchBar: some View {
        HStack(spacing: 10) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16, weight: .medium))
                .foregroundColor(OffpeakTheme.textTertiary)
            TextField("Search Manhattan", text: $searchText)
                .font(.system(size: 15))
                .foregroundColor(OffpeakTheme.ink)
                .tint(OffpeakTheme.navy)
                .submitLabel(.search)
            if !searchText.isEmpty {
                Button {
                    searchText = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundColor(OffpeakTheme.textTertiary)
                }
            }
        }
        .padding(.horizontal, 16)
        .frame(height: 48)
        .background(OffpeakTheme.searchField, in: Capsule())
        .overlay(Capsule().strokeBorder(OffpeakTheme.cardBorder, lineWidth: 0.5))
    }

    // MARK: Content states
    @ViewBuilder
    private var content: some View {
        let results = filteredPOIs
        if viewModel.isLoading {
            ProgressView()
                .tint(OffpeakTheme.navy)
                .frame(maxWidth: .infinity)
                .padding(.top, 48)
        } else if let error = viewModel.errorMessage {
            errorState(error)
        } else if results.isEmpty {
            emptyState
        } else {
            LazyVStack(spacing: 16) {
                ForEach(results) { poi in
                    NavigationLink(value: poi.slug) {
                                PlaceCard(poi: poi,
                                          isSaved: savedStore.isSaved(slug: poi.slug),
                                          onToggleSave: { handleToggleSave(slug: poi.slug) }
                                )
                            }
                            .buttonStyle(.plain)
                }
            }
        }
    }

    private func errorState(_ message: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 32))
                .foregroundColor(OffpeakTheme.textTertiary)
            Text(message)
                .font(.system(size: 14))
                .foregroundColor(OffpeakTheme.textSecondary)
                .multilineTextAlignment(.center)
            Button {
                Task { await viewModel.loadPOIs(force: true) }
            } label: {
                Text("Try again")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 18)
                    .frame(height: 38)
                    .background(OffpeakTheme.navy, in: Capsule())
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 48)
    }

    private var emptyState: some View {
        VStack(spacing: 8) {
            Image(systemName: searchText.isEmpty ? "mappin.slash" : "magnifyingglass")
                .font(.system(size: 30))
                .foregroundColor(OffpeakTheme.textTertiary)
            Text(searchText.isEmpty ? "No places yet" : "No matches for “\(searchText)”")
                .font(.system(size: 14))
                .foregroundColor(OffpeakTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 48)
    }
    
    private var filterChips: some View{
        HStack(spacing: 8){
            accessMenu
            ScrollView(.horizontal, showsIndicators: false){
                HStack(spacing: 8){
                    ForEach(POICategory.allCases){ cat in
                        categoryChip(cat)
                    }
                }
                
            }
        }
    }
    
    
    private var accessMenu: some View{
        Menu{
            ForEach(accessOptions, id: \.self){ option in
                Button{
                    accessFilter = option
                }label: {
                    let title = option?.labelFilter ?? "All"
                    if accessFilter == option {
                        Label(title, systemImage: "checkmark")
                    }else{
                        Text(title)
                    }
                }
            }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "figure.roll")
                    .font(.system(size: 13, weight: .semibold))
                Text(accessFilter?.labelFilter ?? "Access")
                    .font(.system(size: 13, weight: .semibold))
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .bold))
            }
            .foregroundColor(accessFilter == nil ? Color(hex: 0x3B4658) : .white)
            .frame(width: 110, height: 33)
            .background(accessFilter == nil ? Color.white.opacity(0.6) : OffpeakTheme.navy, in: Capsule())
            .overlay(Capsule().strokeBorder(OffpeakTheme.cardBorder, lineWidth: accessFilter == nil ? 0.5 : 0))
            .contentShape(Capsule())
            .fixedSize(horizontal: true, vertical: false)   
        }
        
    }
    
    private func categoryChip(_ cat: POICategory) -> some View {
        let selected = cat == selectedCategory
        return Button {
            selectedCategory = cat
        } label: {
            Text(cat.label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(selected ? .white : Color(hex: 0x3B4658))
                .padding(.horizontal, 16)
                .frame(height: 33)
                .background(selected ? OffpeakTheme.navy : Color.white.opacity(0.6), in: Capsule())
                .overlay(Capsule().strokeBorder(OffpeakTheme.cardBorder, lineWidth: selected ? 0 : 0.5))
        }
        .buttonStyle(.plain)
    }
    
    private func handleToggleSave(slug: String){
        print("🔖 handleToggleSave called, slug:", slug, "isLoggedIn:", authManager.isLoggedIn)
        guard authManager.isLoggedIn else {
            authManager.requireLogin()
            return
        }
        Task { await savedStore.toggle(slug: slug) }
    }
        
    
    
}

#Preview {
    ExploreView()
            .environmentObject(AuthManager())
            .environmentObject(SavedPOIStore())
}
