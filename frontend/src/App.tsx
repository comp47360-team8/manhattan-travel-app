import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "./App.css";

import AIPlanner from "./components/AiPlanner";
import AttractionCard from "./components/AttractionCard";
import AuthForm from "./components/AuthForm";
import BusynessChart from "./components/BusynessChart";
import CategoryTabs from "./components/CategoryTabs";
import MyItinerary from "./components/MyItinerary";
import Profile from "./components/Profile";
import SavedItineraries from "./components/SavedItineraries";
import SearchBar from "./components/SearchBar";
import TopNav from "./components/TopNav";
import poiPhotoFallback from "./assets/poi-photo-fallback.svg";

import { apiFetch } from "./api";

import type {
  ApiMessageResponse,
  AuthMode,
  AuthUser,
  ItineraryResponse,
  PoiCrowdForecast,
  Poi,
  ProfilePreferences,
} from "./types";

type Page =
  | "explore"
  | "ai"
  | "itinerary"
  | "saved"
  | "profile";

const PAGE_PATHS: Record<Page, string> = {
  explore: "/explore",
  ai: "/planner",
  itinerary: "/itinerary",
  saved: "/saved",
  profile: "/profile",
};

const PROTECTED_PAGES: Page[] = ["itinerary", "saved", "profile"];

function normalisePath(pathname: string): string {
  return pathname.length > 1
    ? pathname.replace(/\/+$/, "")
    : pathname;
}

function getPageFromPath(pathname: string): Page {
  const path = normalisePath(pathname);

  if (path === "/planner") {
    return "ai";
  }

  if (path === "/itinerary") {
    return "itinerary";
  }

  if (path === "/saved") {
    return "saved";
  }

  if (path === "/profile") {
    return "profile";
  }

  return "explore";
}

function getPoiSlugFromPath(pathname: string): string | null {
  const match = normalisePath(pathname).match(/^\/explore\/([^/]+)$/);

  if (!match) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

function isKnownAppPath(pathname: string): boolean {
  const path = normalisePath(pathname);

  return (
    Object.values(PAGE_PATHS).includes(path) ||
    /^\/explore\/[^/]+$/.test(path)
  );
}

const USER_STORAGE_KEY = "offpeak_user";
const PROFILE_PREFERENCES_KEY = "offpeak_profile_preferences";

type ForecastPeriod = "today" | "tomorrow" | "weekend";

type AccessibilitySupport = "confirmed" | "limited" | "unknown";

/*
  Reads the locally stored display information for the logged-in user.

  The actual authentication token is not stored here. It remains inside
  the backend's secure HttpOnly cookie.
*/
function loadStoredUser(): AuthUser | null {
  try {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);

    if (!storedUser) {
      return null;
    }

    const parsedUser = JSON.parse(storedUser) as Partial<AuthUser>;

    if (
      typeof parsedUser.email !== "string" ||
      typeof parsedUser.displayName !== "string"
    ) {
      localStorage.removeItem(USER_STORAGE_KEY);
      return null;
    }

    return {
      email: parsedUser.email,
      displayName: parsedUser.displayName,
      accessibility: parsedUser.accessibility === true,
    };
  } catch (error) {
    console.error("Could not read the stored user:", error);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

/*
  The preference is kept on this device until the backend exposes a profile
  preference endpoint. App owns it so Explore, Profile and My Itinerary all
  use the same value immediately.
*/
function getProfilePreferencesKey(user: AuthUser): string {
  return `${PROFILE_PREFERENCES_KEY}:${user.email.trim().toLowerCase()}`;
}

function loadProfilePreferences(
  user: AuthUser | null
): ProfilePreferences {
  const fallback: ProfilePreferences = {
    stepFreeRoutes: user?.accessibility === true,
  };

  if (!user) {
    return fallback;
  }

  try {
    const accountKey = getProfilePreferencesKey(user);
    const stored =
      localStorage.getItem(accountKey) ??
      localStorage.getItem(PROFILE_PREFERENCES_KEY);

    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(stored) as Partial<ProfilePreferences>;
    const preferences = {
      stepFreeRoutes: parsed.stepFreeRoutes === true,
    };

    /*
      I migrate the earlier device-wide value to this account so existing
      users keep their selection without exposing it to other accounts.
    */
    if (!localStorage.getItem(accountKey)) {
      localStorage.setItem(accountKey, JSON.stringify(preferences));
      localStorage.removeItem(PROFILE_PREFERENCES_KEY);
    }

    return preferences;
  } catch {
    return fallback;
  }
}

/*
  Returns true when a backend error means that the user needs to log in.
*/
function isAuthenticationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("log in") ||
    message.includes("not authenticated") ||
    message.includes("authentication") ||
    message.includes("access token") ||
    message.includes("refresh token")
  );
}

/*
  Checks whether a POI contains a wheelchair-related accessibility label.
*/
function isWheelchairAccessible(poi: Poi): boolean {
  return (
    poi.accessibility_labels?.some((label) => {
      const normalisedLabel = label.toLowerCase();

      return (
        normalisedLabel.includes("wheelchair") ||
        normalisedLabel.includes("step-free") ||
        normalisedLabel.includes("step free")
      );
    }) ?? false
  );
}

function getAccessibilitySupport(poi: Poi): AccessibilitySupport {
  const labels = (poi.accessibility_labels ?? []).map((label) =>
    label.toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")
  );

  if (
    labels.some(
      (label) =>
        label === "wheelchair" ||
        label === "wheelchair_yes" ||
        label.includes("step_free")
    )
  ) {
    return "confirmed";
  }

  if (labels.some((label) => label.includes("wheelchair_limited"))) {
    return "limited";
  }

  return "unknown";
}

/*
  Creates readable recommendation wording without pretending that forecast
  data exists when the backend has not returned it.
*/
function getBestTimeLabel(poi: Poi): string {
  if (poi.best_time_label?.trim()) {
    return poi.best_time_label;
  }

  return "Recommendation pending";
}

function getNewYorkHour(): number {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hourCycle: "h23",
  }).format(new Date());

  return Number(hour);
}

function getCardCrowdSummary(
  forecast: PoiCrowdForecast
): string {
  if (forecast.today.length === 0) {
    return "Forecast unavailable";
  }

  const currentHour = getNewYorkHour();
  const currentForecast = forecast.today.find(
    (entry) => entry.hour_of_day === currentHour
  );
  const selectedForecast =
    currentForecast ??
    forecast.today.reduce((quietest, entry) =>
      entry.busyness < quietest.busyness ? entry : quietest
    );
  const percentage = Math.round(selectedForecast.busyness);
  const level =
    percentage <= 35
      ? "Quiet"
      : percentage <= 65
        ? "Moderate"
        : "Busy";

  return currentForecast
    ? `${level} now · ${percentage}%`
    : `${level} period · ${percentage}%`;
}

/*
  I show up to six real readings spread across the available daytime forecast.
  Some periods contain fewer readings, so I preserve the honest API coverage
  instead of inventing percentages just to fill every chart position.
*/
function selectForecastSlots(
  hours: PoiCrowdForecast[ForecastPeriod]
): PoiCrowdForecast[ForecastPeriod] {
  const daytimeHours = hours.filter(
    (entry) => entry.hour_of_day >= 10 && entry.hour_of_day <= 20
  );

  if (daytimeHours.length <= 6) {
    return daytimeHours;
  }

  const finalIndex = daytimeHours.length - 1;
  const selectedIndexes = Array.from({ length: 6 }, (_, index) =>
    Math.round((index * finalIndex) / 5)
  );

  return selectedIndexes.map((index) => daytimeHours[index]);
}

const openingHourDays = [
  ["mon", "Monday"],
  ["tue", "Tuesday"],
  ["wed", "Wednesday"],
  ["thu", "Thursday"],
  ["fri", "Friday"],
  ["sat", "Saturday"],
  ["sun", "Sunday"],
] as const;

function formatOpeningTime(value: string): string {
  const [hourText, minute = "00"] = value.split(":");
  const hour = Number(hourText);

  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return value;
  }

  const displayHour = hour % 12 || 12;
  const displayMinute = minute === "00" ? "" : `:${minute}`;
  return `${displayHour}${displayMinute} ${hour >= 12 ? "PM" : "AM"}`;
}

/*
  I format the structured hours returned by the API instead of printing the
  legacy text field, which can contain damaged dash characters.
*/
function formatOpeningHours(poi: Poi): string[] {
  if (poi.opening_hours) {
    const lines = openingHourDays.map(([key, label]) => {
      const periods = poi.opening_hours?.[key];

      if (!Array.isArray(periods) || periods.length === 0) {
        return `${label}: Closed`;
      }

      const formattedPeriods = periods
        .filter(
          (period): period is [string, string] =>
            Array.isArray(period) &&
            typeof period[0] === "string" &&
            typeof period[1] === "string"
        )
        .map(
          ([start, end]) =>
            `${formatOpeningTime(start)}–${formatOpeningTime(end)}`
        );

      return `${label}: ${formattedPeriods.join(", ") || "Closed"}`;
    });

    return lines;
  }

  if (poi.opening_hours_text?.trim()) {
    return poi.opening_hours_text.split(";").map((line) =>
      line
        .trim()
        .replace(/[^\x20-\x7E]+/g, "–")
        .replace(/–+/g, "–")
    );
  }

  return ["Not currently available"];
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPage = getPageFromPath(location.pathname);
  const routePoiSlug = getPoiSlugFromPath(location.pathname);
  const isProtectedPage = PROTECTED_PAGES.includes(currentPage);

  /*
    Authentication state.

    The display information is restored from localStorage when the app opens.
    Backend requests still depend on the HttpOnly authentication cookie.
  */
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [profilePreferences, setProfilePreferences] =
    useState<ProfilePreferences>(() => loadProfilePreferences(user));

  const [aiGeneratedItinerary, setAiGeneratedItinerary] =
    useState<ItineraryResponse | null>(null);

  /*
    POI API state.
  */
  const [pois, setPois] = useState<Poi[]>([]);
  const [isLoadingPois, setIsLoadingPois] = useState(true);
  const [poiError, setPoiError] = useState("");
  const selectedPoi = routePoiSlug
    ? pois.find((poi) => poi.slug === routePoiSlug) ?? null
    : null;
  const isPoiDetailRoute = routePoiSlug !== null;
  const [selectedPoiForecast, setSelectedPoiForecast] =
    useState<PoiCrowdForecast | null>(null);
  const [isLoadingForecasts, setIsLoadingForecasts] = useState(false);
  const [forecastError, setForecastError] = useState("");
  const [forecastPeriod, setForecastPeriod] =
    useState<ForecastPeriod>("today");
  const selectedPoiSlug = selectedPoi?.slug;
  const [crowdSummaryBySlug, setCrowdSummaryBySlug] = useState<
    Record<string, string>
  >({});
  const crowdSummaryCacheRef = useRef<Record<string, string>>({});
  const loadingCrowdSlugsRef = useRef(new Set<string>());

  /*
    I keep the address bar canonical so direct links and browser history use
    the same page URLs as navigation inside the app.
  */
  useEffect(() => {
    if (location.pathname === "/" || !isKnownAppPath(location.pathname)) {
      navigate(PAGE_PATHS.explore, { replace: true });
    }
  }, [location.pathname, navigate]);

  /*
    Card forecasts are loaded lazily and cached by slug. Duplicate cards in
    Featured and All Attractions therefore share one backend request.
  */
  const requestCardCrowdSummary = useCallback(async (slug: string) => {
    if (
      crowdSummaryCacheRef.current[slug] ||
      loadingCrowdSlugsRef.current.has(slug)
    ) {
      return;
    }

    loadingCrowdSlugsRef.current.add(slug);

    try {
      const forecast = await apiFetch<PoiCrowdForecast>(
        `/api/pois/${encodeURIComponent(slug)}/crowd-forecast`
      );
      const summary = getCardCrowdSummary(forecast);

      crowdSummaryCacheRef.current[slug] = summary;
      setCrowdSummaryBySlug((current) => ({
        ...current,
        [slug]: summary,
      }));
    } catch (error) {
      console.info(`Card forecast was not loaded for ${slug}:`, error);
      const summary = "Forecast unavailable";

      crowdSummaryCacheRef.current[slug] = summary;
      setCrowdSummaryBySlug((current) => ({
        ...current,
        [slug]: summary,
      }));
    } finally {
      loadingCrowdSlugsRef.current.delete(slug);
    }
  }, []);

  /*
    Explore search and filter state.
  */
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [accessibleOnly, setAccessibleOnly] = useState(false);

  /*
    Saved POI state.
  */
  const [savedPoiSlugs, setSavedPoiSlugs] = useState<string[]>([]);
  const [savingPoiSlug, setSavingPoiSlug] = useState<string | null>(
    null
  );
  const [savePoiMessage, setSavePoiMessage] = useState("");
  const [savePoiMessageType, setSavePoiMessageType] = useState<
    "success" | "error"
  >("success");
  const [pendingAccessibleSave, setPendingAccessibleSave] =
    useState<Poi | null>(null);

  /*
    Load all POIs when the application starts.
  */
  useEffect(() => {
    let isCancelled = false;

    async function loadPois() {
      try {
        setIsLoadingPois(true);
        setPoiError("");

        const data = await apiFetch<Poi[]>("/api/pois");

        if (!isCancelled) {
          setPois(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load POIs:", error);

        if (!isCancelled) {
          setPoiError(
            error instanceof Error
              ? error.message
              : "Attractions could not be loaded."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingPois(false);
        }
      }
    }

    loadPois();

    return () => {
      isCancelled = true;
    };
  }, []);

  /*
    The crowd endpoint belongs to one attraction, so I request it only when
    that POI is opened. This avoids sending 198 separate requests on Explore.
  */
  useEffect(() => {
    if (!selectedPoiSlug) {
      return;
    }

    const slug = selectedPoiSlug;
    let isCancelled = false;

    async function loadCrowdForecast() {
      try {
        setIsLoadingForecasts(true);
        setForecastError("");

        const data = await apiFetch<PoiCrowdForecast>(
          `/api/pois/${encodeURIComponent(slug)}/crowd-forecast`
        );

        if (!isCancelled) {
          setSelectedPoiForecast(data);
        }
      } catch (error) {
        console.error("Failed to load the crowd forecast:", error);

        if (!isCancelled) {
          setSelectedPoiForecast(null);
          setForecastError(
            "Hourly crowd forecasts are temporarily unavailable."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingForecasts(false);
        }
      }
    }

    void loadCrowdForecast();

    return () => {
      isCancelled = true;
    };
  }, [selectedPoiSlug]);

  /* Clear local display state after the backend session ends. */
  function handleLocalLogout() {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setProfilePreferences({ stepFreeRoutes: false });
    setSavedPoiSlugs([]);
    setPendingAccessibleSave(null);
  }

  /*
    I update the shared saved-place state when a place is removed from the
    Saved page so the Explore heart changes immediately without a refresh.
  */
  const handleSavedPlaceRemoved = useCallback((slug: string) => {
    setSavedPoiSlugs((currentSavedSlugs) =>
      currentSavedSlugs.filter((savedSlug) => savedSlug !== slug)
    );
  }, []);

  /*
    Load saved attractions only when the frontend considers the user logged in.

    This prevents protected API calls from showing token errors to logged-out
    visitors.
  */
  useEffect(() => {
    let isCancelled = false;

    async function loadSavedPois() {
      if (!user) {
        setSavedPoiSlugs([]);
        return;
      }

      try {
        const savedPois = await apiFetch<Poi[]>(
          "/api/users/me/saved-pois"
        );

        if (!isCancelled) {
          setSavedPoiSlugs(
            Array.isArray(savedPois)
              ? savedPois.map((poi) => poi.slug)
              : []
          );
        }
      } catch (error) {
        console.info("Saved POIs were not loaded:", error);

        if (!isCancelled && isAuthenticationError(error)) {
          /*
            The local display state may remain after the secure cookie expires.
            Clear it so the interface returns to the logged-out state.
          */
          localStorage.removeItem(USER_STORAGE_KEY);
          setUser(null);
          setProfilePreferences({ stepFreeRoutes: false });
          setSavedPoiSlugs([]);
          setPendingAccessibleSave(null);
        }
      }
    }

    loadSavedPois();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  /*
    Search by name, neighbourhood, borough, or POI type.

    Category and accessibility filtering are applied after the text search.
  */
  const normalisedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredPois = pois.filter((poi) => {
    const matchesSearch =
      normalisedSearchTerm === "" ||
      poi.name.toLowerCase().includes(normalisedSearchTerm) ||
      poi.type.toLowerCase().includes(normalisedSearchTerm) ||
      poi.borough.toLowerCase().includes(normalisedSearchTerm) ||
      (poi.neighborhood ?? "")
        .toLowerCase()
        .includes(normalisedSearchTerm);

    const matchesCategory =
      selectedCategory === "all" ||
      poi.type.toLowerCase() === selectedCategory.toLowerCase();

    const matchesAccessibility =
      !accessibleOnly || isWheelchairAccessible(poi);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesAccessibility
    );
  });

  /*
    Category totals follow the current search and accessibility filter.
    This lets each tab show how many matching places it contains.
  */
  const categoryCounts = pois.reduce<Record<string, number>>(
    (counts, poi) => {
      const matchesSearch =
        normalisedSearchTerm === "" ||
        poi.name.toLowerCase().includes(normalisedSearchTerm) ||
        poi.type.toLowerCase().includes(normalisedSearchTerm) ||
        poi.borough.toLowerCase().includes(normalisedSearchTerm) ||
        (poi.neighborhood ?? "")
          .toLowerCase()
          .includes(normalisedSearchTerm);

      const matchesAccessibility =
        !accessibleOnly || isWheelchairAccessible(poi);

      if (!matchesSearch || !matchesAccessibility) {
        return counts;
      }

      const type = poi.type.toLowerCase();
      counts.all = (counts.all ?? 0) + 1;
      counts[type] = (counts[type] ?? 0) + 1;

      return counts;
    },
    { all: 0 }
  );

  const filtersActive =
    normalisedSearchTerm !== "" ||
    selectedCategory !== "all" ||
    accessibleOnly;

  function clearExploreFilters() {
    setSearchTerm("");
    setSelectedCategory("all");
    setAccessibleOnly(false);
  }

  /*
    Recommended attractions are chosen from POIs containing genuine
    best-time data from the backend.
  */
  const featuredPois = [...pois]
    .filter(
      (poi) =>
        Boolean(poi.best_time_label?.trim()) &&
        poi.google_review_star !== null
    )
    .sort((firstPoi, secondPoi) => {
      const ratingDifference =
        (secondPoi.google_review_star ?? 0) -
        (firstPoi.google_review_star ?? 0);

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      return (
        (secondPoi.google_review_count ?? 0) -
        (firstPoi.google_review_count ?? 0)
      );
    })
    .slice(0, 4);

  /*
    When the profile preference is enabled, I show every attraction with
    confirmed accessibility before the complete attraction list. I do not
    limit this section because the preference is intended to surface all
    suitable options, not only a small featured sample.
  */
  const accessiblePreferredPois = [...pois]
    .filter((poi) => getAccessibilitySupport(poi) === "confirmed")
    .sort((firstPoi, secondPoi) => {
      const ratingDifference =
        (secondPoi.google_review_star ?? 0) -
        (firstPoi.google_review_star ?? 0);

      if (ratingDifference !== 0) {
        return ratingDifference;
      }

      return (
        (secondPoi.google_review_count ?? 0) -
        (firstPoi.google_review_count ?? 0)
      );
    });

  function openLogin() {
    setAuthMode("login");
    setIsAuthModalOpen(true);
  }

  function openRegister() {
    setAuthMode("register");
    setIsAuthModalOpen(true);
  }

  function closeAuthModal() {
    setIsAuthModalOpen(false);
  }

  function switchToLogin() {
    setAuthMode("login");
  }

  function handleAuthenticationSuccess(authenticatedUser: AuthUser) {
    setUser(authenticatedUser);
    setProfilePreferences(
      loadProfilePreferences(authenticatedUser)
    );
    setIsAuthModalOpen(false);
    setSavePoiMessage("");
  }

  function updateProfilePreferences(preferences: ProfilePreferences) {
    setProfilePreferences(preferences);

    if (user) {
      localStorage.setItem(
        getProfilePreferencesKey(user),
        JSON.stringify(preferences)
      );
    }
  }

  async function handleLogout() {
    try {
      /*
        Logout is requested from the backend so its secure cookies can be
        cleared. Local state is cleared even if the backend is unavailable.
      */
      await apiFetch<ApiMessageResponse>("/api/auth/logout", {
        method: "POST",
      });
    } catch (error) {
      console.info(
        "The backend logout request did not complete:",
        error
      );
    } finally {
      handleLocalLogout();

      if (isProtectedPage) {
        navigate(PAGE_PATHS.explore, { replace: true });
      }
    }
  }

  function goToPage(page: string) {
    if (!Object.hasOwn(PAGE_PATHS, page)) {
      return;
    }

    const nextPage = page as Page;

    /*
      Profile, Saved and My Itinerary are account areas.

      Opening them while logged out displays the login modal rather than a
      technical authentication error.
    */
    if (
      (nextPage === "profile" ||
        nextPage === "saved" ||
        nextPage === "itinerary") &&
      !user
    ) {
      openLogin();
      return;
    }

    navigate(PAGE_PATHS[nextPage]);
    setSavePoiMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function updateSavedPoi(slug: string) {
    if (!user) {
      setSavePoiMessageType("error");
      setSavePoiMessage(
        "You need to log in to save attractions."
      );
      openLogin();
      return;
    }

    const isCurrentlySaved = savedPoiSlugs.includes(slug);

    setSavePoiMessage("");

    try {
      setSavingPoiSlug(slug);

      const response = await apiFetch<ApiMessageResponse>(
        `/api/pois/${slug}/save`,
        {
          method: isCurrentlySaved ? "DELETE" : "POST",
        }
      );

      setSavedPoiSlugs((currentSavedSlugs) => {
        if (isCurrentlySaved) {
          return currentSavedSlugs.filter(
            (savedSlug) => savedSlug !== slug
          );
        }

        if (currentSavedSlugs.includes(slug)) {
          return currentSavedSlugs;
        }

        return [...currentSavedSlugs, slug];
      });

      setSavePoiMessageType("success");
      setSavePoiMessage(
        response.message ||
          (isCurrentlySaved
            ? "Attraction removed from your saved places."
            : "Attraction saved.")
      );
    } catch (error) {
      console.error(
        "Failed to update saved attraction:",
        error
      );

      if (isAuthenticationError(error)) {
        handleLocalLogout();
        setSavePoiMessageType("error");
        setSavePoiMessage(
          "Your session has expired. Please log in again."
        );
        openLogin();
        return;
      }

      setSavePoiMessageType("error");
      setSavePoiMessage(
        error instanceof Error
          ? error.message
          : "The attraction could not be updated."
      );
    } finally {
      setSavingPoiSlug(null);
    }
  }

  function toggleSavePoi(slug: string) {
    const poi = pois.find((item) => item.slug === slug);
    const isCurrentlySaved = savedPoiSlugs.includes(slug);

    if (
      user &&
      poi &&
      !isCurrentlySaved &&
      profilePreferences.stepFreeRoutes &&
      getAccessibilitySupport(poi) !== "confirmed"
    ) {
      setPendingAccessibleSave(poi);
      return;
    }

    void updateSavedPoi(slug);
  }

  function renderAttractionCard(poi: Poi) {
    return (
      <AttractionCard
        key={poi.slug}
        slug={poi.slug}
        image={
          poi.hero_image_url ||
          poiPhotoFallback
        }
        name={poi.name}
        crowdLevel={
          crowdSummaryBySlug[poi.slug] ?? "Loading forecast"
        }
        bestTime={getBestTimeLabel(poi)}
        neighborhood={
          poi.neighborhood ||
          poi.borough ||
          "Manhattan"
        }
        rating={poi.google_review_star}
        reviewCount={poi.google_review_count}
        isAccessible={isWheelchairAccessible(poi)}
        isSaved={savedPoiSlugs.includes(poi.slug)}
        isSaving={savingPoiSlug === poi.slug}
        onSaveClick={() => toggleSavePoi(poi.slug)}
        onForecastRequest={requestCardCrowdSummary}
        onClick={() => {
          setSelectedPoiForecast(null);
          setForecastPeriod("today");
          navigate(
            `${PAGE_PATHS.explore}/${encodeURIComponent(poi.slug)}`
          );
          setSavePoiMessage("");

          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }}
      />
    );
  }

  return (
    <div className="app">
      <TopNav
        currentPage={currentPage}
        onPageChange={goToPage}
        user={user}
        onLoginClick={openLogin}
        onRegisterClick={openRegister}
        onLogoutClick={handleLogout}
      />

      <main className="page-container">
        {isProtectedPage && !user && (
          <section className="route-login-card" aria-labelledby="login-required-title">
            <p className="section-eyebrow">Account required</p>
            <h1 id="login-required-title">Please log in to continue</h1>
            <p>
              This page contains your personal Offpeak information and is
              available after you log in.
            </p>
            <div className="route-login-actions">
              <button type="button" onClick={openLogin}>Log in</button>
              <button type="button" onClick={() => goToPage("explore")}>
                Return to Explore
              </button>
            </div>
          </section>
        )}

        {currentPage === "explore" &&
          !isPoiDetailRoute && (
            <>
              <header className="explore-hero">
                <p className="hero-eyebrow">
                  Manhattan Guide
                </p>

                <h1>
                  Explore Manhattan at quieter times
                </h1>

                <p className="hero-subtitle">
                  Find attractions, compare hourly crowd
                  forecasts and plan visits around the times
                  that suit you.
                </p>

                {!user && (
                  <div className="hero-auth-actions">
                    <button
                      type="button"
                      onClick={openLogin}
                    >
                      Log in
                    </button>

                    <button
                      type="button"
                      onClick={openRegister}
                    >
                      Create account
                    </button>
                  </div>
                )}

                {user && (
                  <p className="explore-welcome">
                    Welcome back,{" "}
                    <strong>{user.displayName}</strong>.
                  </p>
                )}
              </header>

              <section
                className="explore-filter-shell"
                aria-labelledby="explore-filter-title"
              >
                <h2 id="explore-filter-title" className="sr-only">
                  Search and filter Manhattan attractions
                </h2>

                <SearchBar
                  value={searchTerm}
                  onSearchChange={setSearchTerm}
                />

                <CategoryTabs
                  selectedCategory={selectedCategory}
                  categoryCounts={categoryCounts}
                  onCategoryChange={setSelectedCategory}
                  accessibleOnly={accessibleOnly}
                  onAccessibleOnlyChange={setAccessibleOnly}
                  filtersActive={filtersActive}
                  onClearFilters={clearExploreFilters}
                />
              </section>

              {isLoadingPois && (
                <p className="loading-message">
                  Loading attractions...
                </p>
              )}

              {poiError && (
                <p className="error-message">
                  {poiError}
                </p>
              )}

              {savePoiMessage && (
                <p
                  className={
                    savePoiMessageType === "error"
                      ? "error-message"
                      : "success-message"
                  }
                >
                  {savePoiMessage}
                </p>
              )}

              {!isLoadingPois &&
                !poiError &&
                !filtersActive &&
                profilePreferences.stepFreeRoutes &&
                accessiblePreferredPois.length > 0 && (
                  <section className="featured-section accessible-picks-section">
                    <div className="section-heading-row">
                      <p className="section-eyebrow">
                        Your accessibility preference
                      </p>

                      <h2>Accessible places for you</h2>

                      <p className="section-description">
                        All {accessiblePreferredPois.length} attractions with
                        confirmed wheelchair or step-free access are shown
                        first. The complete attraction list remains available
                        below.
                      </p>
                    </div>

                    <section className="featured-grid">
                      {accessiblePreferredPois.map(renderAttractionCard)}
                    </section>
                  </section>
                )}

              {!isLoadingPois &&
                !poiError &&
                !filtersActive &&
                !profilePreferences.stepFreeRoutes &&
                featuredPois.length > 0 && (
                  <section className="featured-section">
                    <div className="section-heading-row">
                      <p className="section-eyebrow">
                        Data-backed picks
                      </p>

                      <h2>Popular places with quieter times</h2>

                      <p className="section-description">
                        Highly rated attractions with published quieter-time
                        recommendations, ranked by rating and review count.
                      </p>
                    </div>

                    <section className="featured-grid">
                      {featuredPois.map(
                        renderAttractionCard
                      )}
                    </section>
                  </section>
                )}

              {!isLoadingPois && !poiError && (
                <section className="all-attractions-section">
                  <div className="section-heading-row">
                    <p className="section-eyebrow">
                      Browse Manhattan
                    </p>

                    <h2>All attractions</h2>

                    <p className="section-result-count">
                      {filteredPois.length}{" "}
                      {filteredPois.length === 1
                        ? "place"
                        : "places"}
                    </p>
                  </div>

                  {filteredPois.length === 0 ? (
                    <p className="fallback-message">
                      No attractions match the current
                      search and filters.
                    </p>
                  ) : (
                    <section className="cards">
                      {filteredPois.map(
                        renderAttractionCard
                      )}
                    </section>
                  )}
                </section>
              )}
            </>
          )}

        {currentPage === "explore" &&
          isPoiDetailRoute &&
          isLoadingPois && (
            <p className="fallback-message" role="status">
              Loading attraction details...
            </p>
          )}

        {currentPage === "explore" &&
          isPoiDetailRoute &&
          !isLoadingPois &&
          !poiError &&
          selectedPoi === null && (
            <section className="route-login-card">
              <p className="section-eyebrow">Attraction not found</p>
              <h1>This attraction is unavailable</h1>
              <p>The link may be outdated, or the attraction may have moved.</p>
              <div className="route-login-actions">
                <button type="button" onClick={() => goToPage("explore")}>
                  Return to Explore
                </button>
              </div>
            </section>
          )}

        {currentPage === "explore" &&
          selectedPoi !== null && (
            <section className="poi-detail">
              <button
                type="button"
                className="back-button"
                onClick={() => {
                  goToPage("explore");
                }}
              >
                ← Back to Explore
              </button>

              {savePoiMessage && (
                <p
                  className={
                    savePoiMessageType === "error"
                      ? "error-message"
                      : "success-message"
                  }
                >
                  {savePoiMessage}
                </p>
              )}

              <section className="poi-detail-layout">
                <div className="poi-detail-main">
                  <img
                    className="poi-detail-hero"
                    src={
                      selectedPoi.hero_image_url ||
                      poiPhotoFallback
                    }
                    alt={selectedPoi.name}
                    onError={(event) => {
                      if (
                        !event.currentTarget.src.endsWith(
                          "poi-photo-fallback.svg"
                        )
                      ) {
                        event.currentTarget.src = poiPhotoFallback;
                      }
                    }}
                  />

                  <p className="section-eyebrow">
                    {selectedPoi.type}
                  </p>

                  <h1>{selectedPoi.name}</h1>

                  <div className="poi-title-meta">
                    <span>
                      {selectedPoi.neighborhood ||
                        selectedPoi.borough ||
                        "Manhattan"}
                    </span>

                    <span>
                      {selectedPoi.google_review_star
                        ? `★ ${selectedPoi.google_review_star}`
                        : "Rating pending"}
                    </span>

                    <span>
                      {selectedPoi.admission_text ||
                        "Admission details pending"}
                    </span>
                  </div>

                  <p className="poi-summary">
                    {selectedPoi.description ||
                      selectedPoi.summary ||
                      "A full description is not available yet."}
                  </p>

                  <section className="recommendation-panel">
                    <p className="section-eyebrow">
                      Recommended time
                    </p>

                    <h2>
                      {selectedPoi.best_time_label ||
                        "Recommendation pending"}
                    </h2>

                    <p>
                      {selectedPoi.why_this_time ||
                        "Crowd-based timing information has not been published for this attraction yet."}
                    </p>
                  </section>

                  <section className="crowd-chart-panel">
                    <div className="crowd-chart-heading">
                      <div>
                        <p className="section-eyebrow">
                          Crowd information
                        </p>

                        <h2>Hourly crowd forecast</h2>
                      </div>
                    </div>

                    <div
                      className="forecast-period-tabs"
                      role="group"
                      aria-label="Crowd forecast period"
                    >
                      {(["today", "tomorrow", "weekend"] as ForecastPeriod[]).map(
                        (period) => (
                          <button
                            key={period}
                            type="button"
                            className={forecastPeriod === period ? "active" : ""}
                            onClick={() => setForecastPeriod(period)}
                            aria-pressed={forecastPeriod === period}
                          >
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                          </button>
                        )
                      )}
                    </div>

                    {isLoadingForecasts ? (
                      <p className="fallback-message">
                        Loading hourly forecast...
                      </p>
                    ) : (selectedPoiForecast?.[forecastPeriod]?.length ?? 0) > 0 ? (
                      <BusynessChart
                        hours={selectForecastSlots(
                          selectedPoiForecast?.[forecastPeriod] ?? []
                        )}
                        poiName={selectedPoi.name}
                      />
                    ) : (
                      <div className="forecast-status-card" role="status">
                        <span className="forecast-status-icon" aria-hidden="true">
                          i
                        </span>

                        <div>
                          <strong>Forecast unavailable</strong>
                          <p>
                            {forecastError ||
                              `No ${forecastPeriod} crowd forecast is available for this attraction.`}
                          </p>
                        </div>
                      </div>
                    )}

                    <p className="chart-note">
                      Forecast percentages are estimates. Lower bars indicate
                      quieter expected visiting periods.
                    </p>
                  </section>

                  <section className="accessibility-panel">
                    <h2>Accessibility</h2>

                    {selectedPoi.accessibility_labels &&
                    selectedPoi.accessibility_labels.length >
                      0 ? (
                      <div className="accessibility-grid">
                        {selectedPoi.accessibility_labels.map(
                          (label) => (
                            <p key={label}>
                              <span aria-hidden="true">✓</span>{" "}
                              {label.replaceAll("_", " ")}
                            </p>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="fallback-message">
                        Accessibility information has not been
                        supplied for this attraction.
                      </p>
                    )}
                  </section>
                </div>

                <aside className="poi-detail-sidebar">
                  <section className="map-panel">
                    {selectedPoi.map_embed_url ? (
                      <iframe
                        src={selectedPoi.map_embed_url}
                        title={`${selectedPoi.name} map`}
                        loading="lazy"
                      />
                    ) : (
                      <p className="fallback-message">
                        Map preview unavailable.
                      </p>
                    )}

                    {selectedPoi.map_external_url && (
                      <a
                        className="map-link"
                        href={selectedPoi.map_external_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on map
                        <span aria-hidden="true">↗</span>
                      </a>
                    )}
                  </section>

                  <button
                    className="sidebar-save-button"
                    type="button"
                    onClick={() =>
                      toggleSavePoi(selectedPoi.slug)
                    }
                    disabled={
                      savingPoiSlug === selectedPoi.slug
                    }
                  >
                    {savingPoiSlug === selectedPoi.slug
                      ? "Updating..."
                      : savedPoiSlugs.includes(
                            selectedPoi.slug
                          )
                        ? "Remove from saved"
                        : user
                          ? "Save for my trip"
                          : "Log in to save"}
                  </button>

                  <section className="detail-card">
                    <h3>Details</h3>

                    <p>
                      <strong>Opening hours</strong>
                    </p>

                    <ul className="opening-hours-list">
                      {formatOpeningHours(selectedPoi).map((line) => {
                        const [day, ...hours] = line.split(": ");

                        return (
                          <li key={line}>
                            {hours.length > 0 ? (
                              <>
                                <span>{day}</span>
                                <strong>{hours.join(": ")}</strong>
                              </>
                            ) : (
                              <span>{line}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>

                    <p>
                      <strong>Admission</strong>
                      <br />
                      {selectedPoi.admission_text ||
                        "Not currently available"}
                    </p>

                    <p>
                      <strong>
                        Recommended duration
                      </strong>
                      <br />
                      {selectedPoi.recommended_duration_min
                        ? `${selectedPoi.recommended_duration_min} minutes`
                        : "Not currently available"}
                    </p>

                    <p>
                      <strong>Closest subway</strong>
                      <br />
                      {selectedPoi.closest_subway ||
                        "Not currently available"}
                    </p>

                    <p>
                      <strong>Address</strong>
                      <br />
                      {selectedPoi.address ||
                        "Not currently available"}
                    </p>

                    {selectedPoi.website_url && (
                      <a
                        className="detail-website-link"
                        href={selectedPoi.website_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visit official website ↗
                      </a>
                    )}
                  </section>
                </aside>
              </section>
            </section>
          )}

        {currentPage === "itinerary" && user && (
          <MyItinerary
            pois={pois}
            onLoginRequired={openLogin}
            preferAccessiblePlaces={profilePreferences.stepFreeRoutes}
            initialItinerary={aiGeneratedItinerary}
          />
        )}

        {currentPage === "saved" && user && (
          <SavedItineraries
            pois={pois}
            onLoginRequired={openLogin}
            onSavedPlaceRemoved={handleSavedPlaceRemoved}
            preferAccessiblePlaces={profilePreferences.stepFreeRoutes}
          />
        )}

        {currentPage === "ai" && (
          <AIPlanner
            pois={pois}
            isAuthenticated={Boolean(user)}
            onLoginRequired={openLogin}
            onItineraryGenerated={(itinerary) => {
              setAiGeneratedItinerary(itinerary);
              navigate(PAGE_PATHS.itinerary);
            }}
          />
        )}

        {currentPage === "profile" && user && (
          <Profile
            user={user}
            onLogout={handleLogout}
            preferences={profilePreferences}
            onPreferencesChange={updateProfilePreferences}
          />
        )}
      </main>

      <footer className="site-footer">
        <strong>Offpeak Manhattan</strong>

        <div>
          <a href="#accessibility">
            Accessibility
          </a>

          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#support">Support</a>
        </div>

        <span>
          © 2026 Offpeak Manhattan. Editorial discovery.
        </span>
      </footer>

      {isAuthModalOpen && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeAuthModal();
            }
          }}
        >
          <AuthForm
            authMode={authMode}
            onXClick={closeAuthModal}
            onRegisterClick={openRegister}
            onLoginClick={switchToLogin}
            onAuthSuccess={handleAuthenticationSuccess}
          />
        </div>
      )}

      {pendingAccessibleSave && (
        <div
          className="accessibility-warning-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingAccessibleSave(null);
            }
          }}
        >
          <section
            className="accessibility-warning-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="save-accessibility-warning-title"
            aria-describedby="save-accessibility-warning-description"
          >
            <div className="accessibility-warning-icon" aria-hidden="true">
              ♿
            </div>

            <p className="section-eyebrow">Accessibility check</p>

            <h2 id="save-accessibility-warning-title">
              {getAccessibilitySupport(pendingAccessibleSave) === "limited"
                ? "Limited accessibility reported"
                : "Accessibility information not confirmed"}
            </h2>

            <p id="save-accessibility-warning-description">
              {getAccessibilitySupport(pendingAccessibleSave) === "limited"
                ? `${pendingAccessibleSave.name} reports limited wheelchair access, so some areas or facilities may not be accessible.`
                : `${pendingAccessibleSave.name} does not have confirmed wheelchair-accessibility information. Missing information does not necessarily mean the attraction is inaccessible.`}
            </p>

            <div className="accessibility-warning-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPendingAccessibleSave(null)}
              >
                Choose another place
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const slug = pendingAccessibleSave.slug;
                  setPendingAccessibleSave(null);
                  void updateSavedPoi(slug);
                }}
              >
                Save anyway
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
