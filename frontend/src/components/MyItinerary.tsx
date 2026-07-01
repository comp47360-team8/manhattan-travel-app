import { useState } from "react";
import SearchBar from "./SearchBar";

/*
  This type is a smaller version of the POI object from App.tsx.

  We only include the fields My Itinerary actually needs.
  If the itinerary page later needs extra backend fields, add them here too.
*/
type Poi = {
  slug: string;
  name: string;
  type: string;
  neighborhood: string | null;
  hero_image_url: string | null;
  google_review_star: number | null;
  google_review_count: number | null;
  best_time_label: string | null;
  why_this_time: string | null;
};

/*
  App.tsx owns the full POI list because it fetches POIs from the backend.
  MyItinerary receives those POIs as props so we do not fetch the same data twice.
*/
type MyItineraryProps = {
  pois: Poi[];
};

function MyItinerary({ pois }: MyItineraryProps) {
  /*
    Search/date/planner state.

    These values only matter inside My Itinerary, so they live here rather than in App.tsx.
  */
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [datesConfirmed, setDatesConfirmed] = useState(false);
  const [dateError, setDateError] = useState("");

  /*
    The selected places are stored as slugs, not full POI objects.

    Why?
    - Slugs are small.
    - Slugs are stable.
    - We can always recover the full POI object from the main pois array.
  */
  const [selectedPoiSlugs, setSelectedPoiSlugs] = useState<string[]>([]);

  /*
    Generation state.

    isGenerating controls the loading button text.
    generatedItinerary stores the current frontend draft itinerary.
    itineraryError is shown if the user tries to generate without selected places.
  */
  const [isGenerating, setIsGenerating] = useState(false);
  const [itineraryError, setItineraryError] = useState("");
  const [generatedItinerary, setGeneratedItinerary] = useState<Poi[]>([]);

  /*
    Inline itinerary editor state.

    This stores the chosen time for each generated itinerary item.
    Example:
    {
      "central-park": "09:00",
      "moma": "11:00"
    }
  */
  const [itineraryTimesBySlug, setItineraryTimesBySlug] = useState<
    Record<string, string>
  >({});

  /*
    BACKEND HOOKUP LATER:
    This is local frontend search over the POIs already fetched in App.tsx.

    If backend later provides a real search endpoint, this section can be replaced with:
    - searchTerm state stays
    - filteredPois/searchResults come from GET /api/pois/search?q=...
  */
  const filteredPois = pois.filter((poi) =>
    poi.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /*
    Keep search results small because itinerary is for selecting places,
    not browsing the full database. Explore already handles full browsing.
  */
  const searchResults = filteredPois.slice(0, 5);

  /*
    Converts selected slugs back into full POI objects.
  */
  const selectedPois = pois.filter((poi) =>
    selectedPoiSlugs.includes(poi.slug)
  );

  /*
    BACKEND HOOKUP LATER:
    Popular POIs are currently derived from Google review count.

    If backend/ML later provides:
    - /api/pois/popular
    - /api/recommendations/popular
    - personalised recommendations

    then replace this local sort with the backend-ranked list.
  */
  const popularPois = [...pois]
    .sort((a, b) => (b.google_review_count || 0) - (a.google_review_count || 0))
    .slice(0, 4);

  /*
    These are the dropdown options for the inline time editor.
    Later, the real algorithm can return actual scheduled times.
  */
  const timeOptions = [
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
  ];

  /*
    Confirms the date range.

    The page should not unlock the planner until both dates are valid.
  */
  function confirmDates() {
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
    setDateError("");
  }

  /*
    Adds a POI to the itinerary selection.

    The duplicate check prevents the same POI being added repeatedly.
  */
  function addPoiToItinerary(slug: string) {
    if (selectedPoiSlugs.includes(slug)) {
      return;
    }

    setSelectedPoiSlugs([...selectedPoiSlugs, slug]);
  }

  /*
    Removes a POI everywhere it appears:
    - selected list
    - generated timeline
    - custom time dropdown state
  */
  function removePoiFromItinerary(slug: string) {
    setSelectedPoiSlugs(
      selectedPoiSlugs.filter((selectedSlug) => selectedSlug !== slug)
    );

    setGeneratedItinerary(
      generatedItinerary.filter((poi) => poi.slug !== slug)
    );

    setItineraryTimesBySlug((currentTimes) => {
      const updatedTimes = { ...currentTimes };
      delete updatedTimes[slug];
      return updatedTimes;
    });
  }

  /*
    Updates the dropdown time for one generated itinerary item.
  */
  function changeItineraryTime(slug: string, newTime: string) {
    setItineraryTimesBySlug({
      ...itineraryTimesBySlug,
      [slug]: newTime,
    });
  }

  /*
    Generates a frontend draft itinerary.

    BACKEND HOOKUP LATER:
    Replace the setTimeout with a real request to the itinerary-generation API.

    Expected future request shape:
    POST /api/itineraries/generate
    {
      start_date: startDate,
      end_date: endDate,
      poi_slugs: selectedPoiSlugs
    }

    Expected future response:
    {
      itinerary: [
        {
          slug: "central-park",
          scheduled_time: "09:00",
          why_this_time: "...",
          ...
        }
      ]
    }

    Then you would set:
    setGeneratedItinerary(data.itinerary)
    setItineraryTimesBySlug(timesFromBackend)
  */
  function generateItinerary() {
    setItineraryError("");

    if (selectedPois.length === 0) {
      setItineraryError("Add at least one place before generating your itinerary.");
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      setGeneratedItinerary(selectedPois);

      const initialTimes: Record<string, string> = {};

      selectedPois.forEach((poi, index) => {
        initialTimes[poi.slug] = timeOptions[index] || "09:00";
      });

      setItineraryTimesBySlug(initialTimes);
      setIsGenerating(false);
    }, 1000);
  }

  return (
    <section className="my-itinerary">
      <p className="section-eyebrow">Trip Planner</p>

      <h1>Build your Manhattan itinerary</h1>

      <p>
        Choose your dates, select attractions, and generate a draft itinerary
        around quieter visiting windows.
      </p>

      <section className="itinerary-date-panel">
        <div className="itinerary-date-grid">
          <label htmlFor="start-date">
            Start date
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(event) => {
                setStartDate(event.target.value);

                /*
                  If dates change after confirmation, reset the planner state.
                  The user should confirm the new dates before generating again.
                */
                setDatesConfirmed(false);
                setGeneratedItinerary([]);
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
                setGeneratedItinerary([]);
              }}
            />
          </label>

          <button onClick={confirmDates}>Confirm Dates</button>
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
            choose saved or popular places, and generate your draft itinerary.
          </p>
        </section>
      )}

      {datesConfirmed && (
        <>
          <section className="itinerary-planner-grid">
            <section className="itinerary-search-section">
              <h2>Search attractions</h2>

              <p>Find specific places you want to include in your trip.</p>

              <SearchBar onSearchChange={setSearchTerm} />

              {searchTerm && (
                <div className="itinerary-search-results">
                  <h3>Search results</h3>

                  {searchResults.length === 0 ? (
                    <p className="fallback-message">No attractions found.</p>
                  ) : (
                    searchResults.map((poi) => (
                      <div key={poi.slug} className="itinerary-poi-row">
                        <span>{poi.name}</span>

                        <button onClick={() => addPoiToItinerary(poi.slug)}>
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>

            <section className="selected-pois-section">
              <h2>Your Selections</h2>

              <p>Places chosen for this itinerary.</p>

              {selectedPois.length === 0 ? (
                <p className="fallback-message">
                  No places selected yet. Use search or popular picks to add
                  attractions.
                </p>
              ) : (
                selectedPois.map((poi) => (
                  <div key={poi.slug} className="itinerary-poi-row">
                    <span>{poi.name}</span>

                    <button onClick={() => removePoiFromItinerary(poi.slug)}>
                      Remove
                    </button>
                  </div>
                ))
              )}
            </section>

            <section className="saved-pois-section">
              <h2>Saved Places</h2>

              <p>
                Saved POIs will appear here once backend saved-place persistence
                is connected.
              </p>

              {/*
                BACKEND HOOKUP LATER:
                Replace this fallback with GET /api/saved-pois.

                Then render saved POIs with:
                savedPois.map(...)
              */}
              <p className="fallback-message">
                No saved places available in this session yet.
              </p>
            </section>

            <section className="popular-pois-section">
              <h2>Popular Picks</h2>

              <p>Highly reviewed attractions you may want to include.</p>

              {popularPois.map((poi) => (
                <div key={poi.slug} className="itinerary-poi-row">
                  <span>{poi.name}</span>

                  <button onClick={() => addPoiToItinerary(poi.slug)}>
                    Add
                  </button>
                </div>
              ))}
            </section>
          </section>

          <section className="itinerary-generate-panel">
            <div>
              <p className="section-eyebrow">Generate</p>

              <h2>Ready to optimise your day?</h2>

              <p>
                This creates a frontend draft from your selected POIs. Later
                this will call the backend itinerary algorithm.
              </p>
            </div>

            <button
              className="generate-itinerary-button"
              onClick={generateItinerary}
              disabled={selectedPois.length === 0 || isGenerating}
            >
              {isGenerating ? "Generating..." : "Generate Itinerary"}
            </button>

            {itineraryError && (
              <p className="error-message">{itineraryError}</p>
            )}
          </section>

          {generatedItinerary.length > 0 && (
            <section className="generated-itinerary-section">
              <div className="itinerary-section-header">
                <p className="section-eyebrow">Optimised Plan</p>

                <h2>Your Manhattan Itinerary</h2>

                <p>
                  {startDate} to {endDate}
                </p>
              </div>

              <div className="itinerary-timeline">
                {generatedItinerary.map((poi, index) => {
                  const currentTime =
                    itineraryTimesBySlug[poi.slug] ||
                    timeOptions[index] ||
                    "09:00";

                  return (
                    <div key={poi.slug} className="itinerary-timeline-row">
                      <div className="timeline-time">{currentTime}</div>

                      <div className="timeline-card">
                        <p className="card-location">
                          {poi.neighborhood || "Manhattan"}
                        </p>

                        <h3>{poi.name}</h3>

                        <p className="best-time">
                          🕘{" "}
                          {poi.best_time_label || "Recommended time pending."}
                        </p>

                        <p className="why-this-time">
                          {poi.why_this_time ||
                            "Why-this-time explanation will appear when recommendation data is available."}
                        </p>

                        <div className="timeline-actions">
                          <label className="time-pill">
                            Time
                            <select
                              value={currentTime}
                              onChange={(event) =>
                                changeItineraryTime(
                                  poi.slug,
                                  event.target.value
                                )
                              }
                            >
                              {timeOptions.map((time) => (
                                <option key={time} value={time}>
                                  {time}
                                </option>
                              ))}
                            </select>
                          </label>

                          <button
                            onClick={() => removePoiFromItinerary(poi.slug)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </section>
  );
}

export default MyItinerary;