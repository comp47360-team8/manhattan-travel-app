# Offpeak — iOS App 📱

Native iOS client for **Offpeak**, the Manhattan trip itinerary planner. Built with **SwiftUI** and **Swift**, talking to the project's FastAPI backend over REST.

> This is the iOS-specific guide. For the project overview, backend setup, and deployment, see the [root README](../README.md).



---

## 📋 Table of Contents

- [🧭 What the App Does](#-what-the-app-does)
- [🏗️ Architecture](#️-architecture)
- [📂 Project Layout](#-project-layout)
- [🌐 Networking Layer](#-networking-layer)
- [🔌 API Endpoints Used](#-api-endpoints-used)
- [💾 Caching](#-caching)
- [🎨 Design System](#-design-system)
- [🩺 Troubleshooting](#-troubleshooting)

---

## 🧭 What the App Does


<p align="center">
  <img src="../docs/images/mobile-explore-ai-planner-poi.png" alt="Offpeak iOS app — Explore, AI Planner, and POI detail" width="55%" />
  <br />
  <em>Native iOS interface — Explore, AI Planner, and POI detail</em>
</p>



Five tabs, matching the web client:

| Tab | Screen | What it does |
|---|---|---|
| 🧭 **Explore** | `Features/Explore` | Scrollable list of Manhattan POIs with photo, rating, live crowd level, and best-time hint. Pull to refresh. |
| ✨ **AI** | `Features/AI` | Chat-based planner. The assistant collects dates, pace, and interests, then returns an itinerary inline that can be saved. |
| 🗓️ **OFFPEAK** | `Features/MyItinerary` | Manual flow: pick dates → pick places → the backend schedules them into crowd-aware time slots. Saved itineraries are listed and reopenable. |
| 🔖 **Save** | `Features/Saved` | Bookmarked POIs, saved straight from Explore or the detail page. |
| 👤 **Profile** | `Features/Auth` | Account info, log in / register / log out. |

Tapping any POI card opens `Features/POIDetails` — photo, description, subway lines, accessibility, and the 6-slot crowd forecast chart.

---

## 🏗️ Architecture

**MVVM + a thin service layer**, with a single shared networking actor underneath.

```
View (SwiftUI)
  ↓ @StateObject / @EnvironmentObject
ViewModel (@MainActor, ObservableObject)   ← owns @Published state, no networking details
  ↓
Service (POIService, AuthService, …)       ← one struct per domain, maps paths to typed calls
  ↓
APIClient (actor, singleton)               ← URLSession, JSON coding, 401 refresh, error mapping
  ↓
Models (Codable structs)
```


---

## 📂 Project Layout

```
ios/
├── ManhattanTravelApp.xcodeproj
└── ManhattanTravelApp/
    ├── App/                 # entry point, ContentView, MainTabView (the 5 tabs)
    ├── Core/
    │   ├── Networking/      # APIClient, APIConfig, HTTPMethod, NetworkError
    │   └── Storage/         # TokenStore (Keychain)
    ├── Models/              # Codable DTOs: POI, POIDetail, CrowdForecast, Itinerary, User, …
    ├── Services/            # POIService, AuthService, ItineraryService, SavedPOIService, AIPlannerService
    ├── Features/
    │   ├── Explore/         # POI list + view model
    │   ├── POIDetails/      # detail page, crowd forecast, subway bullets
    │   ├── POICard/         # PlacesCard, CachedImage (shared card UI)
    │   ├── AI/              # chat planner, inline itinerary card
    │   ├── MyItinerary/     # itinerary list, detail, and the NewTrip flow
    │   ├── Saved/           # SavedPOIStore + SavedView
    │   └── Auth/            # AuthManager, login/register/profile, validation
    ├── DesignSystem/        # OffpeakTheme, BusynessLevel, RangeCalendar, InteractivePopGesture
    ├── PreviewContent/      # PreviewData for SwiftUI previews
    └── Assets.xcassets
```


---

## 🌐 Networking Layer

`Core/Networking/APIClient.swift` is the single path to the backend. It handles:

- **Typed calls** — `get`, `post`, and `delete` are generic over `Encodable` bodies and `Decodable` responses, so callers never touch `URLRequest`.
- **Key conversion** — `JSONEncoder`/`JSONDecoder` are configured with `.convertToSnakeCase` / `.convertFromSnakeCase`, so Swift's `camelCase` maps to the backend's `snake_case` with no `CodingKeys` boilerplate.
- **Automatic 401 recovery** — an authenticated request that comes back `401` triggers a refresh and is retried once, transparently. Concurrent 401s share one refresh via a stored `refreshTask`, so five failing requests cause one refresh call, not five.
- **Session expiry** — if the refresh token itself is rejected, tokens are cleared and an `.authSessionExpired` notification is posted; `AuthManager` listens and re-presents the login sheet.
- **User-facing errors** — `NetworkError` maps everything to three cases (`.http`, `.network`, `.decoding`) and pulls FastAPI's `detail` (string *or* validation array) out of the body, so error banners show the backend's own message.
- **Debug-only decode dumps** — a failed decode prints the type and the raw body under `#if DEBUG`. Very useful when the backend shape drifts.

---


## 🔌 API Endpoints Used

| Method | Path | Auth | Used by |
|---|---|:--:|---|
| `GET` | `/api/pois` | – | `POIService.fetchPOIs` |
| `GET` | `/api/pois/{slug}` | – | `POIService.fetchPOI` |
| `GET` | `/api/pois/{slug}/crowd-forecast` | – | `POIService.fetchCrowdForecast` |
| `POST` | `/api/auth/signup` | – | `AuthService.signup` |
| `POST` | `/api/auth/mobile/login` | – | `AuthService.login` |
| `POST` | `/api/auth/mobile/refresh` | – | `AuthService.refresh` |
| `POST` | `/api/auth/mobile/logout` | – | `AuthService.logout` |
| `GET` | `/api/users/me/saved-pois` | ✅ | `SavedPOIService.fetchSavedPOIs` |
| `POST` | `/api/pois/{slug}/save` | ✅ | `SavedPOIService.save` |
| `DELETE` | `/api/pois/{slug}/save` | ✅ | `SavedPOIService.unsave` |
| `GET` | `/api/users/me/saved-itineraries` | ✅ | `ItineraryService.fetchItineraries` |
| `GET` | `/api/users/me/saved-itineraries/{id}` | ✅ | `ItineraryService.fetchItinerary` |
| `POST` | `/api/itinerary/generate` | – | `ItineraryService.generate` |
| `POST` | `/api/itinerary` | ✅ | `ItineraryService.save` |
| `DELETE` | `/api/itinerary/{id}` | ✅ | `ItineraryService.deleteItinerary` |
| `POST` | `/api/ai/conversations` | ✅ | `AIPlannerService.ensureConversation` |
| `POST` | `/api/ai/converstions/{id}/messages` | ✅ | `AIPlannerService.reply` |

Full interactive API docs: `http://localhost:8000/docs` when the backend is running.

---

## 💾 Caching

Two independent caches keep cold launches fast and cheap:

**POI list** (`ExploreViewModel`) — the Explore list is cached in `UserDefaults` for **48 hours** and painted immediately on launch, before the network call returns. The encode/write happens off the main thread so it never delays the first frame. Crucially, **busyness fields are stripped before caching**: crowd level is time-sensitive, and showing an hours-old "Quiet" as if it were live would be worse than showing nothing.

**Images** (`Features/POICard/CachedImage.swift`) — a two-tier cache: an in-memory `NSCache` for instant hits within a run, plus a disk cache under `Caches/` keyed by the SHA-256 of the URL, so photos survive restarts. The lookup order is memory → disk → network, with disk reads and writes off the main actor. Photo URLs are content-addressed, so cached bytes never go stale.

Both `SavedPOIStore.toggle` and `ItineraryViewModel.delete` also apply **optimistic updates** — the UI changes instantly and rolls back to a snapshot if the request fails.

---

## 🎨 Design System

`DesignSystem/` holds everything shared across screens:

- **`OffpeakTheme`** — the palette (navy / sage / amber / coral / terracotta), frosted-glass card surfaces, the background gradient, and shape constants like `cardRadius`. Views reference the theme, not raw hex.
- **`BusynessLevel`** — the **single source of truth** for crowd levels, used by the Explore card, the detail forecast, and itinerary stops. It has two constructors, and the order matters:
  - `from(level:)` — **preferred**. Uses the backend's own label (`quiet` / `moderate` / `busy` / `very_busy`), and returns `nil` for closed/unavailable so the caller can hide the indicator.
  - `from(pct:)` — only where the API gives a raw 0–100 with no label (e.g. hourly forecast bars). Thresholds are cut at **30 / 50 / 70** to mirror the backend exactly.

  Every surface therefore reads the same as the API. Never re-derive a level or re-bucket a percentage locally.
- **`RangeCalendar`** — the date-range picker used by the New Trip flow.
- **`InteractivePopGesture`** — restores the edge-swipe back gesture on custom navigation bars.

---

## 🩺 Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Explore is empty or shows a network error | Backend not reachable. Confirm it's running and that `APIConfig.baseURL` points at the right host. |
| "iOS 26.0 is not installed" / no matching destination | Install the iOS 26 runtime: **Xcode → Settings → Components**. |
| Build fails on an older Xcode | The project targets iOS 26 — update to **Xcode 26+**. |
| "Unexpected response from server" | A decode failure. Run a Debug build and check the console — the raw body is printed. Usually the backend shape changed. |
| Logged out unexpectedly | The refresh token was rejected, so the session was cleared and the login sheet re-presented. Log in again. |
| Can't log in | No user in your local DB yet — sign up first. |
| Photos don't load | Usually transient network; images cache to disk after the first load, so a second launch shows them instantly. |

---

Part of the **COMP47360** Research Project — see the [root README](../README.md).
