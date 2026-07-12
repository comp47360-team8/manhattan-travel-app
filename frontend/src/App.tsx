import { useEffect, useState } from "react";

import "./App.css";

import AIPlanner from "./components/AiPlanner";
import AttractionCard from "./components/AttractionCard";
import AuthForm from "./components/AuthForm";
import CategoryTabs from "./components/CategoryTabs";
import MyItinerary from "./components/MyItinerary";
import Profile from "./components/Profile";
import SavedItineraries from "./components/SavedItineraries";
import SearchBar from "./components/SearchBar";
import TopNav from "./components/TopNav";

import { apiFetch } from "./api";

import type {
  ApiMessageResponse,
  AuthMode,
  AuthUser,
  Poi,
} from "./types";

type Page =
  | "explore"
  | "ai"
  | "itinerary"
  | "saved"
  | "profile";

const USER_STORAGE_KEY = "offpeak_user";

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
    };
  } catch (error) {
    console.error("Could not read the stored user:", error);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
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

/*
  Creates readable crowd wording without displaying technical placeholders.
*/
function getCrowdLabel(poi: Poi): string {
  if (poi.current_busyness?.trim()) {
    return poi.current_busyness;
  }

  return "Crowd update pending";
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

function App() {
  /*
    Authentication state.

    The display information is restored from localStorage when the app opens.
    Backend requests still depend on the HttpOnly authentication cookie.
  */
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  /*
    Navigation state.
  */
  const [currentPage, setCurrentPage] = useState<Page>("explore");

  /*
    POI API state.
  */
  const [pois, setPois] = useState<Poi[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);
  const [isLoadingPois, setIsLoadingPois] = useState(true);
  const [poiError, setPoiError] = useState("");

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
          handleLocalLogout();
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
    Recommended attractions are chosen from POIs containing genuine
    best-time data from the backend.
  */
  const featuredPois = pois
    .filter((poi) => Boolean(poi.best_time_label?.trim()))
    .slice(0, 4);

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
    setIsAuthModalOpen(false);
    setSavePoiMessage("");
  }

  function handleLocalLogout() {
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setSavedPoiSlugs([]);
    setSelectedPoi(null);

    if (
      currentPage === "profile" ||
      currentPage === "saved"
    ) {
      setCurrentPage("explore");
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
    }
  }

  function goToPage(page: string) {
    const nextPage = page as Page;

    /*
      Profile and Saved are account areas.

      Opening them while logged out displays the login modal rather than a
      technical authentication error.
    */
    if (
      (nextPage === "profile" || nextPage === "saved") &&
      !user
    ) {
      openLogin();
      return;
    }

    setCurrentPage(nextPage);
    setSelectedPoi(null);
    setSavePoiMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function toggleSavePoi(slug: string) {
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

  function renderAttractionCard(poi: Poi) {
    return (
      <AttractionCard
        key={poi.slug}
        image={
          poi.hero_image_url ||
          "https://placehold.co/600x380?text=Manhattan"
        }
        name={poi.name}
        crowdLevel={getCrowdLabel(poi)}
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
        onSaveClick={() => toggleSavePoi(poi.slug)}
        onClick={() => {
          setSelectedPoi(poi);
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
        {currentPage === "explore" &&
          selectedPoi === null && (
            <>
              <header className="explore-hero">
                <p className="hero-eyebrow">
                  Manhattan Guide
                </p>

                <h1>
                  Manhattan, at your best time
                </h1>

                <p className="hero-subtitle">
                  Discover attractions, quieter visiting
                  windows and accessible places across the
                  city.
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

              <SearchBar
                onSearchChange={setSearchTerm}
              />

              <CategoryTabs
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />

              <div className="explore-accessibility-filter">
                <label>
                  <input
                    type="checkbox"
                    checked={accessibleOnly}
                    onChange={(event) =>
                      setAccessibleOnly(
                        event.target.checked
                      )
                    }
                  />

                  <span>
                    Show accessible attractions only
                  </span>
                </label>
              </div>

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
                featuredPois.length > 0 && (
                  <section className="featured-section">
                    <div className="section-heading-row">
                      <p className="section-eyebrow">
                        Recommended windows
                      </p>

                      <h2>Best times to visit</h2>
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
          selectedPoi !== null && (
            <section className="poi-detail">
              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setSelectedPoi(null);
                  setSavePoiMessage("");
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
                      "https://placehold.co/1000x620?text=Manhattan"
                    }
                    alt={selectedPoi.name}
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

                        <h2>Current crowd outlook</h2>
                      </div>
                    </div>

                    {selectedPoi.current_busyness ? (
                      <div className="current-crowd-card">
                        <span className="current-crowd-dot" />

                        <div>
                          <strong>
                            {
                              selectedPoi.current_busyness
                            }
                          </strong>

                          <p>
                            {selectedPoi.current_busyness_at
                              ? `Updated ${selectedPoi.current_busyness_at}`
                              : "Latest available crowd assessment"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="fallback-message">
                        Hourly crowd forecast data is not
                        available from the current POI API
                        response.
                      </p>
                    )}

                    <p className="chart-note">
                      Generated itineraries display hourly
                      busyness data when the scheduler returns
                      it.
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
                            <p key={label}>✓ {label}</p>
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
                      <br />
                      {selectedPoi.opening_hours_text ||
                        "Not currently available"}
                    </p>

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

        {currentPage === "itinerary" && (
          <MyItinerary
            pois={pois}
            onLoginRequired={openLogin}
          />
        )}

        {currentPage === "saved" && user && (
          <SavedItineraries
            pois={pois}
            onLoginRequired={openLogin}
          />
        )}

        {currentPage === "ai" && <AIPlanner />}

        {currentPage === "profile" && user && (
          <Profile
            user={user}
            onLogout={handleLogout}
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
    </div>
  );
}

export default App;