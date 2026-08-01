# Offpeak Web Frontend

The Offpeak web application helps visitors explore Manhattan attractions, compare crowd forecasts, identify quieter visiting times, save places, and generate personalised itineraries.

The frontend is built with React, TypeScript, and Vite. It communicates with the FastAPI backend through relative `/api` requests and uses browser cookies for authentication.

## Requirements

Before running the frontend, install:

- Node.js 20 or later
- npm

API-dependent features also require the Offpeak FastAPI backend to be running.

No frontend `.env` file is currently required. Local API routing is configured in `vite.config.ts`, while production API routing is configured in `vercel.json`.

## Installation

From the repository root, run:

```powershell
cd frontend
npm ci
```

`npm ci` installs the exact dependency versions recorded in `package-lock.json`.

The frontend does not use a Python `requirements.txt` file. Its dependencies are managed through `package.json` and `package-lock.json`.

## Running the application

Start the frontend development server:

```powershell
npm run dev
```

Vite will display the local address in the terminal. The default address is:

```text
http://localhost:5173
```

For API-dependent features, the backend should also be running at:

```text
http://localhost:8000
```

During local development, requests beginning with `/api` are forwarded to the backend by the proxy in `vite.config.ts`.

## Available commands

### Start the development server

```powershell
npm run dev
```

Starts the Vite development server with automatic browser updates when frontend files change.

### Run lint checks

```powershell
npm run lint
```

Checks the frontend source using ESLint.

### Create a production build

```powershell
npm run build
```

Runs the TypeScript compiler and creates an optimised production build in the `dist` directory.

### Preview the production build

```powershell
npm run preview
```

Serves the completed production build locally for final verification.

## Main application routes

| Route | Purpose |
|---|---|
| `/explore` | Browse, search, and filter Manhattan attractions |
| `/explore/:slug` | View the details and crowd forecast for an attraction |
| `/planner` | Use the conversational AI itinerary planner |
| `/itinerary` | Select places and generate an itinerary |
| `/itinerary/:id` | Open a saved itinerary |
| `/saved` | View saved places and saved itineraries |
| `/profile` | View the user profile and accessibility preference |

The application redirects unknown routes to `/explore`.

## Main frontend structure

```text
frontend/
├── public/                  Public static assets
├── src/
│   ├── assets/              Images and visual assets
│   ├── components/          Page views and shared interface components
│   ├── App.css              Application styling and responsive layouts
│   ├── App.tsx              Application state, navigation, and page composition
│   ├── api.ts               Shared API requests and error handling
│   ├── itinerary.ts         Itinerary formatting utilities
│   ├── main.tsx             React and browser-router entry point
│   ├── text.ts              Text normalisation and display helpers
│   └── types.ts             Shared TypeScript types
├── index.html               Main HTML document
├── package.json             Dependencies and npm commands
├── package-lock.json        Locked dependency versions
├── vercel.json              Production routing configuration
└── vite.config.ts           Vite and local API proxy configuration
```

## Main components

The frontend is divided into page-level views and shared components.

Notable components include:

- `AiPlanner` for the conversational planning workflow
- `AttractionCard` for POI summaries, crowd states, and save controls
- `AuthForm` for login and registration
- `BusynessChart` for labelled hourly crowd forecasts
- `CategoryTabs` for POI category filtering
- `ItineraryDetail` for displaying saved itinerary details
- `ItineraryTimeline` for displaying scheduled itinerary stops
- `MyItinerary` for selecting attractions and generating an itinerary
- `Profile` for user details and accessibility preferences
- `SavedItineraries` for saved places and itinerary management
- `SearchBar` for attraction search
- `TopNav` for application navigation
- `TripDateRangeField` for itinerary date selection

## API communication

Frontend API requests are made through the shared helper in `src/api.ts`.

The helper centralises:

- Relative `/api` requests
- Browser-cookie credentials
- Response parsing
- Request timeouts
- Authentication errors
- User-facing fallback messages

For local development, the Vite proxy forwards requests as follows:

```text
/api/* → http://localhost:8000/api/*
```

In production, Vercel forwards `/api` requests to the deployed Offpeak API.

## Authentication and security

The web application uses browser cookies for authentication.

Authentication tokens and API secrets must not be stored in frontend source code or browser local storage. Gemini, Groq, database, and JWT secrets belong only in the backend environment configuration.

The frontend currently does not read any `VITE_*` environment variables and therefore does not require a frontend `.env` file.

Local storage is used only for harmless interface information where required, such as display preferences.

## Main features

The web frontend includes:

- Explore with all supported POI categories
- Search by attraction name, type, borough, and neighbourhood
- POI detail pages
- Hourly crowd forecasts
- Quieter-time recommendations
- Accessible-place information and preferences
- Login, registration, and logout
- Saved places
- Saved itineraries
- Itinerary generation
- Itinerary timeline and crowd charts
- Conversational AI planning
- Profile preferences
- Responsive desktop, tablet, and mobile layouts
- Keyboard-accessible controls and visible focus states
- Professional loading, empty, unavailable, and error states

## Accessibility behaviour

Accessibility information comes from the POI data returned by the backend.

The frontend can:

- Highlight attractions with confirmed accessibility information
- Prioritise accessible attractions when the user enables the preference
- Keep other attractions available rather than hiding information
- Warn users when they select an attraction without confirmed access
- Display accessibility using text as well as colour

A missing accessibility value is treated as unknown information and is not presented as confirmed access.

## Crowd forecast behaviour

Crowd information is presented using labelled states so that meaning does not depend on colour alone.

The principal states are:

- Quiet
- Moderate
- Busy
- Not open today
- Forecast unavailable

`Not open today` is used only when the attraction is closed for the selected day. `Forecast unavailable` is used when forecast data is missing.

Hourly forecasts are rendered using the custom `BusynessChart` component, with time labels, a textual legend, and responsive bars.

## Saved-state behaviour

Saved-place state is shared across Explore, POI details, Saved Places, and itinerary selection.

When a place is saved or removed, the frontend updates the relevant views so that heart and save controls remain consistent.

Saved itineraries can be opened through their individual `/itinerary/:id` routes.

## Error handling

The frontend provides user-facing messages for expected failure states, including:

- Authentication required
- Request timeout
- Network connection failure
- Rate limit reached
- Server error
- Forecast unavailable
- Empty itinerary
- AI service unavailable

Technical backend messages are translated into readable interface messages where appropriate.

## Validation before committing

After changing frontend source files, run:

```powershell
npm run lint
npm run build
```

Both commands should complete without errors.

The affected feature should then be tested manually in the browser against a running backend. Authentication, saving, crowd forecasts, itinerary generation, saved itineraries, and the AI Planner require runtime testing because they depend on backend responses and browser-cookie behaviour.

## Recommended local verification

1. Start the backend.
2. Start the frontend with `npm run dev`.
3. Open `/explore`.
4. Confirm that POIs load.
5. Test search and category filters.
6. Open a POI detail page.
7. Confirm that its crowd forecast or correct unavailable state appears.
8. Test login and logout.
9. Save and remove a place.
10. Generate an itinerary.
11. Open a saved itinerary.
12. Test the AI Planner.
13. Check the browser console for unexpected errors.
14. Run `npm run lint`.
15. Run `npm run build`.

## Deployment

The frontend is deployed through Vercel and is available at:

https://offpeak.live/

The SPA fallback in `vercel.json` supports direct navigation and browser refreshes on routes such as `/explore`, `/planner`, and `/itinerary`.

Production deployment also depends on the deployed backend and its environment configuration being available.
