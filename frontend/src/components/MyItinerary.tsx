import { useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import BusynessChart from "./BusynessChart";
import { apiFetch } from "../api";
import { groupStopsByDay } from "../itinerary";

import type {
  ItineraryGenerateRequest,
  ItineraryResponse,
  Poi,
  SavedItinerary,
} from "../types";

/*
  App.tsx already fetches all POIs and passes them into this component.

  onLoginRequired is optional for now so the project still builds before
  we update App.tsx. Later, App.tsx will pass the function that opens the
  existing login modal.
*/
type MyItineraryProps = {
  pois: Poi[];
  onLoginRequired?: () => void;
};

/*
  The current itinerary service cannot schedule a POI when opening hours are
  missing. I keep those places in Explore, but exclude them from this planner
  until the backend handles null opening-hour data safely.
*/
function canUseInItinerary(poi: Poi): boolean {
  return (
    poi.opening_hours !== null &&
    Object.keys(poi.opening_hours).length > 0
  );
}

function formatItineraryDate(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function MyItinerary({ pois, onLoginRequired }: MyItineraryProps) {
  /*
    Basic form state.

    The backend needs:
    - a trip name
    - a start date
    - an end date
    - selected POI slugs
    - accessibility requirements
  */
  const [tripName, setTripName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [accessibilityNeed, setAccessibilityNeed] = useState("");

  /*
    The planner stays locked until valid dates have been confirmed.
  */
  const [datesConfirmed, setDatesConfirmed] = useState(false);
  const [dateError, setDateError] = useState("");

  /*
    Selected attractions are stored using their slugs.

    This matches the backend request because the itinerary endpoint expects
    a list of POI slug names rather than full POI objects.
  */
  const [selectedPoiSlugs, setSelectedPoiSlugs] = useState<string[]>([]);

  /*
    Saved POIs are loaded from the logged-in user's account.

    This replaces the old placeholder in the Saved Places section.
  */
  const [savedPois, setSavedPois] = useState<Poi[]>([]);
  const [isLoadingSavedPois, setIsLoadingSavedPois] = useState(false);
  const [savedPoisMessage, setSavedPoisMessage] = useState("");

  /*
    Generation and saving state.

    generatedItinerary stores the exact JSON returned by the backend.
    We keep that exact object because the API documentation says the whole
    generated response must be sent back when saving.
  */
  const [generatedItinerary, setGeneratedItinerary] =
    useState<ItineraryResponse | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [itineraryError, setItineraryError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
    Load the user's saved POIs when this component first appears.

    The endpoint is protected, so a logged-out user may receive a 401.
    That is not treated as a page-breaking error because the rest of the
    planner is still available without logging in.
  */
  useEffect(() => {
    async function loadSavedPois() {
      try {
        setIsLoadingSavedPois(true);
        setSavedPoisMessage("");

        const data = await apiFetch<Poi[]>("/api/users/me/saved-pois");

        setSavedPois(data);
      } catch (error) {
        /*
          A logged-out user is allowed to use itinerary generation, so we only
          show a small message inside the Saved Places panel.
        */
        if (error instanceof Error) {
          const message = error.message.toLowerCase();

          if (
            message.includes("not authenticated") ||
            message.includes("authentication")
          ) {
            setSavedPoisMessage("Log in to view your saved places.");
          } else {
            setSavedPoisMessage("Saved places could not be loaded.");
          }
        }
      } finally {
        setIsLoadingSavedPois(false);
      }
    }

    loadSavedPois();
  }, []);

  /*
    Search locally through the POIs already loaded by App.tsx.

    We do not need another backend request because App.tsx already owns the
    complete POI list.
  */
  const normalisedSearchTerm = searchTerm.trim().toLowerCase();

  const filteredPois = pois.filter((poi) => {
    if (!canUseInItinerary(poi)) {
      return false;
    }

    return (
      normalisedSearchTerm === "" ||
      poi.name.toLowerCase().includes(normalisedSearchTerm) ||
      poi.type.toLowerCase().includes(normalisedSearchTerm) ||
      poi.borough.toLowerCase().includes(normalisedSearchTerm) ||
      (poi.neighborhood ?? "")
        .toLowerCase()
        .includes(normalisedSearchTerm)
    );
  });

  /*
    Limit results so the planner does not show a huge list while typing.
  */
  const searchResults = filteredPois.slice(0, 5);

  /*
    Convert selected slugs back into POI objects for displaying names and
    details in the Your Selections panel.
  */
  const selectedPois = pois.filter((poi) =>
    selectedPoiSlugs.includes(poi.slug)
  );

  /*
    Until there is a separate recommendations endpoint, popular POIs are
    calculated using their Google review counts.
  */
  const popularPois = pois
    .filter(canUseInItinerary)
    .sort(
      (firstPoi, secondPoi) =>
        (secondPoi.google_review_count || 0) -
        (firstPoi.google_review_count || 0)
    )
    .slice(0, 4);

  /*
    Confirm that both dates are present and in the correct order.
  */
  function confirmDates() {
    setDateError("");
    setItineraryError("");
    setSuccessMessage("");

    if (startDate === "" || endDate === "") {
      setDateError(
        "Date selection not completed. Please pick a start and end date."
      );
      setDatesConfirmed(false);
      return;
    }

    if (endDate < startDate) {
      setDateError("End date cannot be before the start date.");
      setDatesConfirmed(false);
      return;
    }

    setDatesConfirmed(true);
  }

  /*
    Add a POI only if it is not already selected.
  */
  function addPoiToItinerary(slug: string) {
    if (selectedPoiSlugs.includes(slug)) {
      return;
    }

    const poi = pois.find((item) => item.slug === slug);

    if (!poi) {
      setItineraryError("That attraction could not be found.");
      return;
    }

    if (!canUseInItinerary(poi)) {
      setItineraryError(
        `${poi.name} cannot currently be scheduled because its opening hours are unavailable.`
      );
      return;
    }

    setSelectedPoiSlugs((currentSlugs) => [...currentSlugs, slug]);

    /*
      A previously generated itinerary is no longer accurate after changing
      the selection, so it is cleared.
    */
    setGeneratedItinerary(null);
    setItineraryError("");
    setSuccessMessage("");
  }

  /*
    Remove a POI from the current selection.

    This is before saving, so it only updates local frontend state.
    Editing a saved itinerary will later use the new stop endpoints.
  */
  function removePoiFromItinerary(slug: string) {
    setSelectedPoiSlugs((currentSlugs) =>
      currentSlugs.filter((selectedSlug) => selectedSlug !== slug)
    );

    setGeneratedItinerary(null);
    setItineraryError("");
    setSuccessMessage("");
  }

  /*
    The backend expects accessibility requirements as a list.

    Examples:
    []
    ["wheelchair"]
    ["wheelchair-limited"]
  */
  function buildAccessibilityList(): string[] {
    if (accessibilityNeed === "") {
      return [];
    }

    return [accessibilityNeed];
  }

  /*
    Call the real itinerary generation endpoint.

    This replaces the old setTimeout and frontend-generated draft.
  */
  async function generateItinerary() {
    setItineraryError("");
    setSuccessMessage("");

    if (tripName.trim() === "") {
      setItineraryError("Please enter a name for your itinerary.");
      return;
    }

    if (!datesConfirmed) {
      setItineraryError("Confirm your travel dates before generating.");
      return;
    }

    if (selectedPoiSlugs.length === 0) {
      setItineraryError(
        "Add at least one place before generating your itinerary."
      );
      return;
    }

    const unsupportedPoi = selectedPois.find(
      (poi) => !canUseInItinerary(poi)
    );

    if (unsupportedPoi) {
      setItineraryError(
        `${unsupportedPoi.name} cannot be scheduled because its opening hours are unavailable.`
      );
      return;
    }

    /*
      This shape matches the current FastAPI ItineraryRequest model.

      Important:
      "accessibilty" is misspelled in the backend model, so the frontend must
      use the same spelling until the backend changes.
    */
    const requestBody: ItineraryGenerateRequest = {
      trip_name: tripName.trim(),
      trip_dates: [startDate, endDate],
      pois: selectedPoiSlugs,
      accessibility: buildAccessibilityList(),
    };

    try {
      setIsGenerating(true);
      setGeneratedItinerary(null);

      const result = await apiFetch<ItineraryResponse>(
        "/api/itinerary/generate",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      if (!Array.isArray(result.stops) || result.stops.length === 0) {
        setItineraryError(
          "No suitable schedule could be created for those places and dates. Try changing your selection or travel dates."
        );
        return;
      }

      setGeneratedItinerary(result);
      setSuccessMessage("Your itinerary was generated successfully.");
    } catch (error) {
      console.error("Itinerary generation failed:", error);

      if (error instanceof Error && error.message.includes("500")) {
        setItineraryError(
          "The itinerary service could not create a schedule for that selection. Try different places or dates."
        );
      } else if (error instanceof Error) {
        setItineraryError(error.message);
      } else {
        setItineraryError("The itinerary could not be generated.");
      }
    } finally {
      setIsGenerating(false);
    }
  }

  /*
    Save the exact generated itinerary object.

    The backend requires authentication for this endpoint. If the request
    fails because the user is logged out, App.tsx will later use
    onLoginRequired to open the existing login popup.
  */
  async function saveItinerary() {
    setItineraryError("");
    setSuccessMessage("");

    if (generatedItinerary === null) {
      setItineraryError("Generate an itinerary before saving it.");
      return;
    }

    try {
      setIsSaving(true);

      /*
  Saving now returns the full saved itinerary, including:
  - itinerary_id
  - stop_id values
  - the regenerated saved stops
*/
const savedResult = await apiFetch<SavedItinerary>("/api/itinerary", {
  method: "POST",
  body: JSON.stringify(generatedItinerary),
});

setSuccessMessage(
  `Itinerary "${savedResult.trip_name}" was saved successfully.`
);
    } catch (error) {
      console.error("Saving itinerary failed:", error);

      if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (
          message.includes("not authenticated") ||
          message.includes("authentication failed") ||
          message.includes("unauthorised") ||
          message.includes("unauthorized")
        ) {
          setItineraryError("Please log in before saving your itinerary.");
          onLoginRequired?.();
          return;
        }

        setItineraryError(error.message);
      } else {
        setItineraryError("The itinerary could not be saved.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="my-itinerary">
      <p className="section-eyebrow">Trip Planner</p>

      <h1>Build your Manhattan itinerary</h1>

      <p>
        Choose your dates, select attractions, and generate an itinerary around
        quieter visiting windows.
      </p>

      <section className="itinerary-date-panel">
        <div className="itinerary-date-grid">
          <label htmlFor="trip-name">
            Itinerary name
            <input
              id="trip-name"
              type="text"
              placeholder="e.g. Manhattan weekend"
              value={tripName}
              onChange={(event) => {
                setTripName(event.target.value);
                setGeneratedItinerary(null);
                setSuccessMessage("");
              }}
            />
          </label>

          <label htmlFor="start-date">
            Start date
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);

                /*
                  Dates must be confirmed again whenever either date changes.
                */
                setDatesConfirmed(false);
                setGeneratedItinerary(null);
                setSuccessMessage("");
              }}
            />
          </label>

          <label htmlFor="end-date">
            End date
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(event) => {
                setEndDate(event.target.value);
                setDatesConfirmed(false);
                setGeneratedItinerary(null);
                setSuccessMessage("");
              }}
            />
          </label>

          <label htmlFor="accessibility-need">
            Accessibility
            <select
              id="accessibility-need"
              value={accessibilityNeed}
              onChange={(event) => {
                setAccessibilityNeed(event.target.value);
                setGeneratedItinerary(null);
                setSuccessMessage("");
              }}
            >
              <option value="">No specific requirement</option>
              <option value="wheelchair">Wheelchair accessible</option>
              <option value="wheelchair-limited">
                Limited wheelchair access
              </option>
            </select>
          </label>

          <button type="button" onClick={confirmDates}>
            Confirm Dates
          </button>
        </div>

        {dateError && <p className="error-message">{dateError}</p>}

        {datesConfirmed && (
          <p className="success-message">
            Dates confirmed: {startDate} to {endDate}
          </p>
        )}
      </section>

      {!datesConfirmed && (
        <section className="itinerary-start-state">
          <h2>Start with your travel dates</h2>

          <p>
            Once your trip dates are confirmed, you can search attractions,
            choose saved or popular places, and generate your itinerary.
          </p>
        </section>
      )}

      {datesConfirmed && (
        <>
          <section className="itinerary-planner-grid">
            <section className="itinerary-search-section">
              <h2>Search attractions</h2>

              <p>Find specific places you want to include in your trip.</p>

              <SearchBar onSearchChange={setSearchTerm} variant="compact" />

              {searchTerm && (
                <div className="itinerary-search-results">
                  <h3>Search results</h3>

                  {searchResults.length === 0 ? (
                    <p className="fallback-message">No attractions found.</p>
                  ) : (
                    searchResults.map((poi) => {
                      const isSelected = selectedPoiSlugs.includes(poi.slug);

                      return (
                        <div key={poi.slug} className="itinerary-poi-row">
                          <span>{poi.name}</span>

                          <button
                            type="button"
                            onClick={() => addPoiToItinerary(poi.slug)}
                            disabled={isSelected}
                          >
                            {isSelected ? "Added" : "Add"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </section>

            <section className="selected-pois-section">
              <h2>Your Selections</h2>

              <p>Places chosen for this itinerary.</p>

              {selectedPois.length === 0 ? (
                <p className="fallback-message">
                  No places selected yet. Use search, saved places, or popular
                  picks to add attractions.
                </p>
              ) : (
                selectedPois.map((poi) => (
                  <div key={poi.slug} className="itinerary-poi-row">
                    <span>{poi.name}</span>

                    <button
                      type="button"
                      onClick={() => removePoiFromItinerary(poi.slug)}
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </section>

            <section className="saved-pois-section">
              <h2>Saved Places</h2>

              <p>Add attractions that you previously saved from Explore.</p>

              {isLoadingSavedPois && (
                <p className="loading-message">Loading saved places...</p>
              )}

              {!isLoadingSavedPois && savedPoisMessage && (
                <p className="fallback-message">{savedPoisMessage}</p>
              )}

              {!isLoadingSavedPois &&
                savedPoisMessage === "" &&
                savedPois.length === 0 && (
                  <p className="fallback-message">
                    You have not saved any places yet.
                  </p>
                )}

              {!isLoadingSavedPois &&
                savedPois.filter(canUseInItinerary).map((poi) => {
                  const isSelected = selectedPoiSlugs.includes(poi.slug);

                  return (
                    <div key={poi.slug} className="itinerary-poi-row">
                      <span>{poi.name}</span>

                      <button
                        type="button"
                        onClick={() => addPoiToItinerary(poi.slug)}
                        disabled={isSelected}
                      >
                        {isSelected ? "Added" : "Add"}
                      </button>
                    </div>
                  );
                })}
            </section>

            <section className="popular-pois-section">
              <h2>Popular Picks</h2>

              <p>Highly reviewed attractions you may want to include.</p>

              {popularPois.map((poi) => {
                const isSelected = selectedPoiSlugs.includes(poi.slug);

                return (
                  <div key={poi.slug} className="itinerary-poi-row">
                    <span>{poi.name}</span>

                    <button
                      type="button"
                      onClick={() => addPoiToItinerary(poi.slug)}
                      disabled={isSelected}
                    >
                      {isSelected ? "Added" : "Add"}
                    </button>
                  </div>
                );
              })}
            </section>
          </section>

          <section className="itinerary-generate-panel">
            <div>
              <p className="section-eyebrow">Generate</p>

              <h2>Ready to optimise your trip?</h2>

              <p>
                The backend scheduler will organise your selected attractions
                using dates, availability, geography, and crowd predictions.
              </p>
            </div>

            <button
              className="generate-itinerary-button"
              type="button"
              onClick={generateItinerary}
              disabled={selectedPois.length === 0 || isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Itinerary"}
            </button>
          </section>

          {itineraryError && (
            <p className="error-message">{itineraryError}</p>
          )}

          {successMessage && (
            <p className="success-message">{successMessage}</p>
          )}

          {generatedItinerary !== null && (
            <section className="generated-itinerary-section">
              <div className="itinerary-section-header">
                <div>
                  <p className="section-eyebrow">Optimised Plan</p>

                  <h2>{generatedItinerary.trip_name}</h2>

                  <p>
  {generatedItinerary.start_date} to {generatedItinerary.end_date}
</p>
                </div>

                <button
                  type="button"
                  className="save-itinerary-button"
                  onClick={saveItinerary}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Itinerary"}
                </button>
              </div>
              {/* I show scheduling warnings returned by the backend without hiding valid stops. */}
{generatedItinerary.warning?.trim() && (
  <p className="fallback-message" role="status">
    <strong>Scheduling note:</strong>{" "}
    {generatedItinerary.warning}
  </p>
)}
              {generatedItinerary.stops.length === 0 ? (
                <p className="fallback-message">
                  The itinerary was generated, but it contains no scheduled
                  stops.
                </p>
              ) : (
                <div className="itinerary-days">
                  {groupStopsByDay(generatedItinerary.stops).map((day) => (
                    <section
                      className="itinerary-day-group"
                      key={`${day.dayNumber}-${day.visitDate}`}
                    >
                      <header className="itinerary-day-heading">
                        <div>
                          <p className="section-eyebrow">Day {day.dayNumber}</p>
                          <h3>{formatItineraryDate(day.visitDate)}</h3>
                        </div>

                        <span>
                          {day.stops.length} {day.stops.length === 1 ? "place" : "places"}
                        </span>
                      </header>

                      <div className="itinerary-timeline">
                        {day.stops.map((stop, stopIndex) => (
                          <div
                            key={`${stop.slug}-${stop.position}`}
                            className="itinerary-timeline-row"
                          >
                            <div className="timeline-time">
                              Stop {stopIndex + 1}
                            </div>

                            <div className="timeline-card">
                              <p className="card-location">
                                {stop.neighborhood}, {stop.borough}
                              </p>

                              <h3>{stop.poi_name}</h3>

                              <p className="recommended-window">
                                <strong>Recommended {stop.slot} window</strong>
                                <span>
                                  {stop.slot_start.slice(0, 5)}–{stop.slot_end.slice(0, 5)} · {stop.crowd_level}
                                </span>
                              </p>

                              <p className="why-this-time">
                                <strong>Why this time:</strong>{" "}
                                {pois.find(
                                  (poi) => poi.slug === stop.slug
                                )?.why_this_time?.trim() ||
                                  "Detailed recommendation data is not available for this stop."}
                              </p>

                              <p>
                                Suggested visit: {stop.suggested_duration} minutes
                              </p>

                              {stop.accessibility.length > 0 && (
                                <div className="stop-accessibility-list">
                                  {stop.accessibility.map((item) => (
                                    <span key={String(item)}>
                                      ♿ {String(item)}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {stop.flags.length > 0 && (
                                <div className="stop-flags">
                                  {stop.flags.map((flag) => (
                                    <span key={flag}>{flag}</span>
                                  ))}
                                </div>
                              )}

                              {stop.busyness_for_day.length > 0 ? (
                                <BusynessChart
                                  hours={stop.busyness_for_day}
                                  poiName={stop.poi_name}
                                />
                              ) : (
                                <p className="fallback-message">
                                  Hourly crowd forecast is not available for this stop.
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </section>
  );
}

export default MyItinerary;