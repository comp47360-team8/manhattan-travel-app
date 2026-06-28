import "./App.css";
import AttractionCard from "./components/AttractionCard";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CategoryTabs from "./components/CategoryTabs";
import Authform from "./components/AuthForm";
import TopNav from "./components/TopNav";
import MyItinerary from "./components/MyItinerary";
import { useEffect, useState } from "react";

// Data shape returned by the backend POI API.
type Poi = {
  slug: string;
  name: string;
  type: string;
  address: string | null;
  summary: string | null;
  description: string | null;
  borough: string;
  neighborhood: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  hero_image_url: string | null;
  gallery_image_urls: string[] | null;
  opening_hours: Record<string, unknown> | null;
  opening_hours_text: string | null;
  google_review_star: number | null;
  google_review_count: number | null;
  current_busyness: string | null;
  current_busyness_at: string | null;
  best_time_start: string | null;
  best_time_end: string | null;
  best_time_label: string | null;
  why_this_time: string | null;
  accessibility_labels: string[] | null;
  admission_fee: number | null;
  admission_text: string | null;
  recommended_duration_min: number | null;
  closest_subway: string | null;
  map_embed_url: string | null;
  map_external_url: string | null;
  website_url: string | null;
  tags: string[] | null;
};

function App() {
  // Modal/auth UI state.
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  // Page/navigation state.
  const [currentPage, setCurrentPage] = useState("explore");

  // POI data state.
  const [pois, setPois] = useState<Poi[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  // Loading/error state for POI API call.
  const [isLoadingPois, setIsLoadingPois] = useState(true);
  const [poiError, setPoiError] = useState("");

  // Explore search/filter state.
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [savedPoiSlugs, setSavedPoiSlugs] = useState<string[]>([]);

  // Fetch POIs from the FastAPI backend when the app first loads.
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/pois")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load POIs");
        }

        return response.json();
      })
      .then((data: Poi[]) => {
        setPois(data);
      })
      .catch((error) => {
        console.error("Failed to fetch POIs:", error);
        setPoiError(
          "Could not load attractions. Please make sure the backend is running."
        );
      })
      .finally(() => {
        setIsLoadingPois(false);
      });
  }, []);

  // Search + category filtering for the Explore grid.
  const filteredPois = pois.filter(
    (poi) =>
      poi.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedCategory === "all" || poi.type === selectedCategory)
  );

  // Featured section: show four POIs that already have a best-time recommendation.
  const featuredPois = pois
    .filter((poi) => poi.best_time_label !== null)
    .slice(0, 4);

    const crowdPreviewBars = [
    { label: "8am", height: 30 },
    { label: "10am", height: 45 },
    { label: "12pm", height: 72 },
    { label: "2pm", height: 60 },
    { label: "4pm", height: 58 },
    { label: "6pm", height: 82 },
    { label: "8pm", height: 40 },
  ];


  function openLogin() {
    setAuthMode("login");
    setIsLoginOpen(true);
  }

  function closeLogin() {
    setIsLoginOpen(false);
  }

  function openRegister() {
    setAuthMode("register");
    setIsLoginOpen(true);
  }

  function switchToLogin() {
    setAuthMode("login");
  }

  function goToPage(page: string) {
    setCurrentPage(page);
    setSelectedPoi(null);
  }

  function toggleSavePoi(slug: string) {
  setSavedPoiSlugs((currentSavedSlugs) => {
    if (currentSavedSlugs.includes(slug)) {
      return currentSavedSlugs.filter((savedSlug) => savedSlug !== slug);
    }

    return [...currentSavedSlugs, slug];
  });
}

  return (
    <main className="app">
      <TopNav currentPage={currentPage} onPageChange={goToPage} />

      <section className="page-container">
        {currentPage === "explore" && selectedPoi === null && (
          <>
            <Header onLoginClick={openLogin} onRegisterClick={openRegister} />

            <SearchBar onSearchChange={setSearchTerm} />

            <CategoryTabs
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />

            {isLoadingPois && (
              <p className="loading-message">Loading attractions...</p>
            )}

            {poiError && <p className="error-message">{poiError}</p>}

            {!isLoadingPois && !poiError && featuredPois.length > 0 && (
              <section className="featured-section">
                <div className="section-heading-row">
                  <p className="section-eyebrow">Recommended windows</p>
                  <h2>Best Times This Morning</h2>
                </div>

                <section className="featured-grid">
                  {featuredPois.map((poi) => (
                    <AttractionCard
                      key={poi.slug}
                      image={
                        poi.hero_image_url || "https://placehold.co/300x180"
                      }
                      name={poi.name}
                      crowdLevel={
                        poi.current_busyness || "Crowd forecast unavailable"
                      }
                      bestTime={
                        poi.best_time_label || "Best time not available yet"
                      }
                      neighborhood={
                        poi.neighborhood || "Neighborhood unavailable"
                      }
                      rating={poi.google_review_star}
                      reviewCount={poi.google_review_count}
                      isAccessible={
                        poi.accessibility_labels?.includes("wheelchair") ||
                        false
                      }
                      onClick={() => setSelectedPoi(poi)}
                    />
                  ))}
                </section>
              </section>
            )}

            {!isLoadingPois && !poiError && (
              <section className="all-attractions-section">
                <div className="section-heading-row">
                  <p className="section-eyebrow">Browse Manhattan</p>
                  <h2>All Attractions</h2>
                </div>

                {filteredPois.length === 0 ? (
                  <p className="fallback-message">
                    No attractions match your search.
                  </p>
                ) : (
                  <section className="cards">
                    {filteredPois.map((poi) => (
                      <AttractionCard
                        key={poi.slug}
                        image={
                          poi.hero_image_url || "https://placehold.co/300x180"
                        }
                        name={poi.name}
                        crowdLevel={
                          poi.current_busyness || "Crowd forecast unavailable"
                        }
                        bestTime={
                          poi.best_time_label || "Best time not available yet"
                        }
                        neighborhood={
                          poi.neighborhood || "Neighborhood unavailable"
                        }
                        rating={poi.google_review_star}
                        reviewCount={poi.google_review_count}
                        isAccessible={
                          poi.accessibility_labels?.includes("wheelchair") ||
                          false
                        }
                        onClick={() => setSelectedPoi(poi)}
                      />
                    ))}
                  </section>
                )}
              </section>
            )}
          </>
        )}

        {currentPage === "explore" && selectedPoi !== null && (
  <section className="poi-detail">
    <button className="back-button" onClick={() => setSelectedPoi(null)}>
      Explore › {selectedPoi.name}
    </button>

    <section className="poi-detail-layout">
      <div className="poi-detail-main">
        <img
          className="poi-detail-hero"
          src={selectedPoi.hero_image_url || "https://placehold.co/900x500"}
          alt={selectedPoi.name}
        />

        <h1>{selectedPoi.name}</h1>

        <div className="poi-title-meta">
          <span>{selectedPoi.neighborhood || "Manhattan"}</span>
          <span>⭐ {selectedPoi.google_review_star ?? "N/A"}</span>
          <span>{selectedPoi.admission_text || "Admission info unavailable"}</span>
        </div>

        <p className="poi-summary">
          {selectedPoi.description ||
            selectedPoi.summary ||
            "No description available."}
        </p>

        <section className="recommendation-panel">
          <p className="section-eyebrow">Recommended Time</p>
          <h2>
            {selectedPoi.best_time_label || "Best time not available yet"}
          </h2>
          <p>
            {selectedPoi.why_this_time ||
              "Why-this-time recommendation is not available yet."}
          </p>
        </section>

        <section className="crowd-chart-panel">
          <div className="crowd-chart-heading">
            <h2>Crowd Forecast — Today</h2>
            <div className="chart-tabs">
              <button>Today</button>
              <button>Tomorrow</button>
              <button>Weekend</button>
            </div>
          </div>

          <div className="crowd-chart">
            {crowdPreviewBars.map((bar) => (
              <div className="chart-column" key={bar.label}>
                <div className="chart-bar" style={{ height: `${bar.height}%` }} />
                <span>{bar.label}</span>
              </div>
            ))}
          </div>

          <p className="chart-note">
            Based on historical patterns + ML prediction preview.
          </p>
        </section>

        <section className="accessibility-panel">
          <h2>Accessibility</h2>

          {selectedPoi.accessibility_labels &&
          selectedPoi.accessibility_labels.length > 0 ? (
            <div className="accessibility-grid">
              {selectedPoi.accessibility_labels.map((label) => (
                <p key={label}>♿ {label}</p>
              ))}
            </div>
          ) : (
            <p className="fallback-message">
              Accessibility information unavailable.
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
            <p className="fallback-message">Map unavailable.</p>
          )}

          {selectedPoi.map_external_url && (
            <a
              className="map-link"
              href={selectedPoi.map_external_url}
              target="_blank"
              rel="noreferrer"
            >
              View on map ↗
            </a>
          )}
        </section>

        <button className="sidebar-save-button">Save for my trip</button>

        <section className="detail-card">
          <h3>Details</h3>

          <p>
            <strong>Open Hours</strong>
            <br />
            {selectedPoi.opening_hours_text || "Unavailable"}
          </p>

          <p>
            <strong>Admission</strong>
            <br />
            {selectedPoi.admission_text || "Unavailable"}
          </p>

          <p>
            <strong>Recommended Duration</strong>
            <br />
            {selectedPoi.recommended_duration_min
              ? `${selectedPoi.recommended_duration_min} minutes`
              : "Unavailable"}
          </p>

          <p>
            <strong>Closest Subway</strong>
            <br />
            {selectedPoi.closest_subway || "Unavailable"}
          </p>

          <p>
            <strong>Address</strong>
            <br />
            {selectedPoi.address || "Unavailable"}
          </p>
        </section>
      </aside>
    </section>
  </section>
)}

        {currentPage === "itinerary" && <MyItinerary />}

        {currentPage === "saved" && (
          <p className="fallback-message">Saved Places page coming soon.</p>
        )}

        {currentPage === "ai" && (
          <p className="fallback-message">AI Planner page coming soon.</p>
        )}
      </section>

        <footer className="site-footer">
  <strong>Manhattan Guide</strong>

  <div>
    <a>Accessibility</a>
    <a>Privacy</a>
    <a>Terms</a>
    <a>Support</a>
  </div>

  <span>© 2024 Manhattan Guide. All rights reserved.</span>
</footer>

      {isLoginOpen && (
        <div className="modal-overlay">
          <Authform
            authMode={authMode}
            onXClick={closeLogin}
            onRegisterClick={openRegister}
            onLoginClick={switchToLogin}
          />
        </div>
      )}
    </main>
  );
}

export default App;