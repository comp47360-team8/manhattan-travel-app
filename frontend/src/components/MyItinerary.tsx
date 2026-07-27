import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import SearchBar from "./SearchBar";
import HowItWorks from "./HowItWorks";
import MyTripsCarousel from "./MyTripsCarousel";
import TripDateRangeField from "./TripDateRangeField";
import { apiFetch, isAuthenticationError } from "../api";
import { isWheelchairAccessible } from "../accessibility";
import { countInclusiveDays, parseIsoDate } from "../itinerary";
import poiPhotoFallback from "../assets/poi-photo-fallback.svg";

import type {
  ItineraryGenerateRequest,
  ItineraryResponse,
  Poi,
  SavedItinerary,
} from "../types";

type MyItineraryProps = {
  pois: Poi[];
  onLoginRequired: () => void;
  preferAccessiblePlaces: boolean;
  initialItinerary?: ItineraryResponse | null;
  /*
    Called both when a freshly built itinerary has been saved and when the user
    picks one of their existing trips. App owns navigation, so both cases just
    hand the id up.
  */
  onOpenItinerary: (itineraryId: string) => void;
};

/*
  Mirrors MAX_POIS_PER_DAY in backend/app/core/constants.py. The backend rejects
  an over-full trip with a 422 after generation is requested; holding the same
  number here lets the planner stop the user before that happens.
*/
const MAX_POIS_PER_DAY = 5;

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

/*
  Renders the confirmed range as "Jul 15 – 17, 2026" when the trip stays inside
  one month, and spells out both months otherwise.
*/
function formatTripRange(startDate: string, endDate: string): string {
  const start = parseIsoDate(startDate);
  const end = parseIsoDate(endDate);

  if (!start || !end) {
    return `${startDate} – ${endDate}`;
  }

  const month = new Intl.DateTimeFormat("en-IE", { month: "short" });
  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    return `${month.format(start)} ${start.getDate()} – ${end.getDate()}, ${end.getFullYear()}`;
  }

  return `${month.format(start)} ${start.getDate()} – ${month.format(end)} ${end.getDate()}, ${end.getFullYear()}`;
}

function ItineraryPoiIdentity({ poi }: { poi: Poi }) {
  const location = [poi.neighborhood, poi.borough]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join(" · ");

  return (
    <div className="itinerary-poi-identity">
      <div className="itinerary-poi-thumbnail" aria-hidden="true">
        <img
          src={poi.hero_image_url || poiPhotoFallback}
          alt=""
          loading="lazy"
          onError={(event) => {
            if (!event.currentTarget.src.endsWith("poi-photo-fallback.svg")) {
              event.currentTarget.src = poiPhotoFallback;
            }
          }}
        />
      </div>

      <div>
        <strong>{poi.name}</strong>
        <p>{location || poi.type}</p>
      </div>
    </div>
  );
}

/*
  Every place in the planner carries a link to its own Explore page. It opens in
  a new tab so a half-built selection is never lost to a navigation.
*/
function ItineraryPoiRow({ poi, action }: { poi: Poi; action: ReactNode }) {
  return (
    <div className="itinerary-poi-row">
      <ItineraryPoiIdentity poi={poi} />

      <div className="itinerary-poi-row-actions">
        <a
          className="poi-details-link"
          href={`/explore/${encodeURIComponent(poi.slug)}`}
          target="_blank"
          rel="noreferrer"
          aria-label={`View details for ${poi.name} in a new tab`}
          title={`View details for ${poi.name}`}
        >
          ↗
        </a>

        {action}
      </div>
    </div>
  );
}

function MyItinerary({
  pois,
  onLoginRequired,
  preferAccessiblePlaces,
  initialItinerary = null,
  onOpenItinerary,
}: MyItineraryProps) {
  /*
    Basic form state.

    The backend needs:
    - a trip name
    - a start date
    - an end date
    - selected POI slugs
    - accessibility requirements
  */
  const [tripName, setTripName] = useState(
    initialItinerary?.trip_name ?? ""
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(
    initialItinerary?.start_date ?? ""
  );
  const [endDate, setEndDate] = useState(
    initialItinerary?.end_date ?? ""
  );
  /*
    Seeded from the saved profile preference so people who already told us they
    need step-free access do not have to say it again on every trip. Safe as a
    plain initial value because App loads the user and their preferences
    synchronously from localStorage before this page can mount.
  */
  const [wheelchairOnly, setWheelchairOnly] = useState(
    preferAccessiblePlaces
  );
  const [pendingAccessibilityPoi, setPendingAccessibilityPoi] =
    useState<Poi | null>(null);

  /*
    The planner opens once the dates are committed with "Start planning". The
    range picker cannot produce an out-of-order range, so the only thing left to
    check is that a full range was chosen.
  */
  const [datesConfirmed, setDatesConfirmed] = useState(
    initialItinerary !== null
  );
  const [dateError, setDateError] = useState("");

  /*
    Selected attractions are stored using their slugs.

    This matches the backend request because the itinerary endpoint expects
    a list of POI slug names rather than full POI objects.
  */
  const [selectedPoiSlugs, setSelectedPoiSlugs] = useState<string[]>(() =>
    initialItinerary
      ? Array.from(
          new Set(initialItinerary.stops.map((stop) => stop.slug))
        )
      : []
  );

  /*
    Saved POIs are loaded from the logged-in user's account.
  */
  const [savedPois, setSavedPois] = useState<Poi[]>([]);
  const [isLoadingSavedPois, setIsLoadingSavedPois] = useState(false);
  const [savedPoisMessage, setSavedPoisMessage] = useState("");

  /*
    Building an itinerary is two requests: generate, then save. If the save half
    fails the generated plan is held here so the work is not thrown away and the
    user can retry without regenerating.
  */
  const [isBuilding, setIsBuilding] = useState(false);
  const [unsavedItinerary, setUnsavedItinerary] =
    useState<ItineraryResponse | null>(null);
  const [itineraryError, setItineraryError] = useState("");
  const [statusMessage, setStatusMessage] = useState(
    initialItinerary
      ? "Your AI plan is loaded. Review the places, then generate to save it."
      : ""
  );

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
        if (isAuthenticationError(error)) {
          setSavedPoisMessage("Log in to view your saved places.");
        } else {
          setSavedPoisMessage("Saved places could not be loaded.");
        }
      } finally {
        setIsLoadingSavedPois(false);
      }
    }

    loadSavedPois();
  }, []);

  /*
    Search locally through the POIs already loaded by App.tsx.
  */
  const normalisedSearchTerm = searchTerm.trim().toLowerCase();

  function byAccessibilityPreference(firstPoi: Poi, secondPoi: Poi): number {
    if (!wheelchairOnly) {
      return 0;
    }

    return (
      Number(isWheelchairAccessible(secondPoi)) -
      Number(isWheelchairAccessible(firstPoi))
    );
  }

  const filteredPois = pois
    .filter((poi) => {
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
    })
    .sort(byAccessibilityPreference);

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

  const savedSlugs = new Set(savedPois.map((poi) => poi.slug));

  const savedPoiOptions = [...savedPois]
    .filter(canUseInItinerary)
    .sort(byAccessibilityPreference);

  /*
    There is no popularity endpoint, so "popular" is derived the same way as the
    Explore page's featured strip: rating first, then how many people rated it.
    Places already offered in Saved are left out so the two lists do not repeat.
  */
  const popularPois = pois
    .filter(canUseInItinerary)
    .filter((poi) => !savedSlugs.has(poi.slug))
    .sort(
      (firstPoi, secondPoi) =>
        (secondPoi.google_review_star ?? 0) -
          (firstPoi.google_review_star ?? 0) ||
        (secondPoi.google_review_count ?? 0) -
          (firstPoi.google_review_count ?? 0)
    )
    .slice(0, 6);

  const tripStart = parseIsoDate(startDate);
  const tripEnd = parseIsoDate(endDate);
  const tripDayCount =
    tripStart && tripEnd ? countInclusiveDays(tripStart, tripEnd) : 0;
  const maxSelectablePois = tripDayCount * MAX_POIS_PER_DAY;
  const remainingSelections = Math.max(
    maxSelectablePois - selectedPoiSlugs.length,
    0
  );
  const selectionIsFull =
    maxSelectablePois > 0 && selectedPoiSlugs.length >= maxSelectablePois;

  /*
    Update both trip dates from the range picker. A range end that is earlier
    than the start is impossible in range mode, so no ordering check is needed.
  */
  function handleTripDatesChange(nextStart: string, nextEnd: string) {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setDateError("");
    setUnsavedItinerary(null);
    setStatusMessage("");
  }

  function startPlanning() {
    setItineraryError("");
    setStatusMessage("");

    if (startDate === "" || endDate === "") {
      setDateError("Pick your travel dates to start planning.");
      return;
    }

    setDateError("");
    setDatesConfirmed(true);
  }

  function editTripDates() {
    setDatesConfirmed(false);
    setIsEditingName(false);
    setItineraryError("");
    setStatusMessage("");
  }

  /*
    Add a POI only if it is not already selected.
  */
  function addPoiWithoutAccessibilityWarning(slug: string) {
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

    if (selectionIsFull) {
      setItineraryError(
        `A ${tripDayCount}-day trip fits ${maxSelectablePois} places. Remove one before adding another.`
      );
      return;
    }

    setSelectedPoiSlugs((currentSlugs) => [...currentSlugs, slug]);

    /*
      A plan built from a previous selection is no longer accurate.
    */
    setUnsavedItinerary(null);
    setItineraryError("");
    setStatusMessage("");
  }

  function addPoiToItinerary(slug: string) {
    const poi = pois.find((item) => item.slug === slug);

    if (!poi) {
      setItineraryError("That attraction could not be found.");
      return;
    }

    if (wheelchairOnly && !isWheelchairAccessible(poi)) {
      setPendingAccessibilityPoi(poi);
      return;
    }

    addPoiWithoutAccessibilityWarning(slug);
  }

  function removePoiFromItinerary(slug: string) {
    setSelectedPoiSlugs((currentSlugs) =>
      currentSlugs.filter((selectedSlug) => selectedSlug !== slug)
    );

    setUnsavedItinerary(null);
    setItineraryError("");
    setStatusMessage("");
  }

  /*
    The backend still expects a list of requirement labels, so the single
    wheelchair requirement is sent as [] or ["wheelchair"]. Only the confirmed
    label is ever sent: the backend matches labels exactly, and partial access
    does not satisfy the requirement.
  */
  function buildAccessibilityList(): string[] {
    return wheelchairOnly ? ["wheelchair"] : [];
  }

  /*
    Persist a generated plan and hand the new id back to App, which owns
    navigation. The generated object is posted verbatim because the save
    endpoint expects the exact response body that generation returned.
  */
  async function persistItinerary(itinerary: ItineraryResponse) {
    const saved = await apiFetch<SavedItinerary>("/api/itinerary", {
      method: "POST",
      body: JSON.stringify(itinerary),
    });

    setUnsavedItinerary(null);
    onOpenItinerary(saved.itinerary_id);
  }

  function reportBuildFailure(error: unknown, fallbackMessage: string) {
    console.error(fallbackMessage, error);

    if (isAuthenticationError(error)) {
      setItineraryError("Please log in to save your itinerary.");
      onLoginRequired();
      return;
    }

    if (error instanceof Error && error.message.includes("500")) {
      setItineraryError(
        "The itinerary service could not create a schedule for that selection. Try different places or dates."
      );
      return;
    }

    setItineraryError(
      error instanceof Error ? error.message : fallbackMessage
    );
  }

  /*
    Generate a schedule and save it immediately, so an itinerary always ends up
    with an address of its own rather than living in this component's state.
  */
  async function buildItinerary() {
    setItineraryError("");
    setStatusMessage("");

    if (!datesConfirmed) {
      setItineraryError("Choose your travel dates before generating.");
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

    if (selectedPoiSlugs.length > maxSelectablePois) {
      setItineraryError(
        `A ${tripDayCount}-day trip fits ${maxSelectablePois} places. Remove ${
          selectedPoiSlugs.length - maxSelectablePois
        } to continue.`
      );
      return;
    }

    // This object mirrors the current FastAPI ItineraryRequest schema.
    const requestBody: ItineraryGenerateRequest = {
      trip_name: tripName.trim() || "Untitled trip",
      trip_dates: [startDate, endDate],
      pois: selectedPoiSlugs,
      accessibility: buildAccessibilityList(),
    };

    try {
      setIsBuilding(true);

      const result = await apiFetch<ItineraryResponse>(
        "/api/itinerary/generate",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          // Scheduling may need to evaluate several days and forecast rows.
          signal: AbortSignal.timeout(60_000),
        }
      );

      if (!Array.isArray(result.stops) || result.stops.length === 0) {
        setItineraryError(
          "No suitable schedule could be created for those places and dates. Try changing your selection or travel dates."
        );
        return;
      }

      try {
        await persistItinerary(result);
      } catch (saveError) {
        /*
          Generation succeeded, so the plan is kept for a retry rather than
          being discarded along with the failed save.
        */
        setUnsavedItinerary(result);
        reportBuildFailure(saveError, "Saving the itinerary failed:");
      }
    } catch (error) {
      reportBuildFailure(error, "Itinerary generation failed:");
    } finally {
      setIsBuilding(false);
    }
  }

  async function retrySave() {
    if (unsavedItinerary === null) {
      return;
    }

    setItineraryError("");

    try {
      setIsBuilding(true);
      await persistItinerary(unsavedItinerary);
    } catch (error) {
      reportBuildFailure(error, "Saving the itinerary failed:");
    } finally {
      setIsBuilding(false);
    }
  }

  function renderAddButton(poi: Poi) {
    const isSelected = selectedPoiSlugs.includes(poi.slug);

    return (
      <button
        type="button"
        className="itinerary-add-button"
        onClick={() => addPoiToItinerary(poi.slug)}
        disabled={isSelected || selectionIsFull}
      >
        {isSelected ? "Added" : "Add to trip"}
      </button>
    );
  }

  return (
    <section className="my-itinerary">
      {!datesConfirmed && (
        <>
          <div className="itinerary-intro-row">
            <p className="section-eyebrow">Trip Planner</p>

            {/*
              Anchored from the top because the explainer sits below the trips
              carousel, where almost nobody scrolls to find it.
            */}
            <a className="how-it-works-jump" href="#how-it-works">
              How we build your itinerary ↓
            </a>
          </div>

          {/*
            No standfirst paragraph here: the heading and the create card say
            what the page does, and the explainer below covers the rest. On a
            laptop the space is better spent on the trips carousel.
          */}
          <h1>Build your Manhattan itinerary</h1>

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
                    setUnsavedItinerary(null);
                    setStatusMessage("");
                  }}
                />
              </label>

              <div className="trip-date-control">
                <span className="trip-date-control-label">Trip dates</span>
                <TripDateRangeField
                  startDate={startDate}
                  endDate={endDate}
                  onChange={handleTripDatesChange}
                />
              </div>

              {/*
                One tickbox rather than a dropdown: wheelchair access is the
                only requirement the POI data can answer, and it is either
                needed or not. Partially accessible places do not satisfy it.
              */}
              <div className="itinerary-accessibility-control">
                <span className="trip-date-control-label">Accessibility</span>

                <label className="accessibility-option">
                  <input
                    type="checkbox"
                    checked={wheelchairOnly}
                    onChange={(event) => {
                      setWheelchairOnly(event.target.checked);
                      setUnsavedItinerary(null);
                      setStatusMessage("");
                    }}
                  />

                  <span
                    className="accessibility-option-check"
                    aria-hidden="true"
                  />

                  <span>Wheelchair access required</span>
                </label>
              </div>

              <button
                type="button"
                className="primary-button start-planning-button"
                onClick={startPlanning}
              >
                Start planning →
              </button>
            </div>

            {dateError && <p className="error-message">{dateError}</p>}
          </section>

          <MyTripsCarousel onOpenTrip={onOpenItinerary} />

          <HowItWorks />
        </>
      )}

      {datesConfirmed && (
        <>
          <header className="itinerary-trip-header">
            {isEditingName ? (
              <input
                className="itinerary-trip-name-input"
                type="text"
                autoFocus
                value={tripName}
                placeholder="Name your trip"
                aria-label="Itinerary name"
                onChange={(event) => setTripName(event.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === "Escape") {
                    setIsEditingName(false);
                  }
                }}
              />
            ) : (
              <div className="itinerary-trip-name">
                <h1>{tripName.trim() || "Untitled trip"}</h1>

                <button
                  type="button"
                  className="itinerary-trip-name-edit"
                  onClick={() => setIsEditingName(true)}
                  aria-label="Rename this itinerary"
                  title="Rename this itinerary"
                >
                  ✎
                </button>
              </div>
            )}

            <button
              type="button"
              className="trip-date-chip"
              onClick={editTripDates}
              title="Change your travel dates"
            >
              {formatTripRange(startDate, endDate)} · {tripDayCount}{" "}
              {tripDayCount === 1 ? "day" : "days"}
            </button>
          </header>

          {/*
            Follows the tickbox rather than the saved profile preference, so
            clearing the requirement for one trip also drops the claim that
            accessible places are being prioritised.
          */}
          {wheelchairOnly && (
            <section className="accessibility-preference-banner" role="status">
              <span aria-hidden="true">♿</span>
              <div>
                <strong>Accessible attractions are prioritised</strong>
                <p>
                  Confirmed wheelchair-accessible places appear first. Other
                  attractions remain available and show a warning before they
                  are added.
                </p>
              </div>
            </section>
          )}

          <div className="itinerary-search-bar">
            <SearchBar
              value={searchTerm}
              onSearchChange={setSearchTerm}
              variant="compact"
            />

            {searchTerm && (
              <div className="itinerary-search-results">
                {searchResults.length === 0 ? (
                  <p className="fallback-message">No attractions found.</p>
                ) : (
                  searchResults.map((poi) => (
                    <ItineraryPoiRow
                      key={poi.slug}
                      poi={poi}
                      action={renderAddButton(poi)}
                    />
                  ))
                )}
              </div>
            )}
          </div>

          <section className="itinerary-planner-grid">
            <div className="itinerary-picker-column">
              <section className="saved-pois-section">
                <div className="section-heading-row">
                  <h2>Saved</h2>

                  <a className="section-heading-link" href="/saved">
                    View all
                  </a>
                </div>

                {isLoadingSavedPois && (
                  <p className="loading-message">Loading saved places...</p>
                )}

                {!isLoadingSavedPois && savedPoisMessage && (
                  <p className="fallback-message">{savedPoisMessage}</p>
                )}

                {!isLoadingSavedPois &&
                  savedPoisMessage === "" &&
                  savedPoiOptions.length === 0 && (
                    <p className="fallback-message">
                      You have not saved any places yet. Add some from Explore,
                      or use Popular Picks below.
                    </p>
                  )}

                {!isLoadingSavedPois &&
                  savedPoiOptions.map((poi) => (
                    <ItineraryPoiRow
                      key={poi.slug}
                      poi={poi}
                      action={renderAddButton(poi)}
                    />
                  ))}
              </section>

              <section className="popular-pois-section">
                <h2>Popular Picks</h2>

                <p>
                  The highest-rated places in Manhattan, in case you are still
                  deciding.
                </p>

                {popularPois.length === 0 ? (
                  <p className="fallback-message">
                    Popular places are not available right now.
                  </p>
                ) : (
                  popularPois.map((poi) => (
                    <ItineraryPoiRow
                      key={poi.slug}
                      poi={poi}
                      action={renderAddButton(poi)}
                    />
                  ))
                )}
              </section>
            </div>

            <aside className="selections-panel">
              <div className="selections-panel-header">
                <h2>Your Selections</h2>

                <span className="selections-count">
                  {selectedPoiSlugs.length} / {maxSelectablePois}
                </span>
              </div>

              <div
                className="selections-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={maxSelectablePois}
                aria-valuenow={selectedPoiSlugs.length}
                aria-label="Places chosen for this itinerary"
              >
                <span
                  style={{
                    width: `${
                      maxSelectablePois === 0
                        ? 0
                        : Math.min(
                            (selectedPoiSlugs.length / maxSelectablePois) * 100,
                            100
                          )
                    }%`,
                  }}
                />
              </div>

              {selectedPois.length === 0 ? (
                <p className="fallback-message">
                  Nothing chosen yet. Add places from Saved, Popular Picks, or
                  search.
                </p>
              ) : (
                <div className="selections-list">
                  {selectedPois.map((poi) => (
                    <ItineraryPoiRow
                      key={poi.slug}
                      poi={poi}
                      action={
                        <button
                          type="button"
                          className="selection-remove-button"
                          onClick={() => removePoiFromItinerary(poi.slug)}
                          aria-label={`Remove ${poi.name} from this itinerary`}
                          title={`Remove ${poi.name}`}
                        >
                          ×
                        </button>
                      }
                    />
                  ))}
                </div>
              )}

              <p className="selections-capacity">
                {selectionIsFull
                  ? `That is the most a ${tripDayCount}-day trip can hold (max ${MAX_POIS_PER_DAY} per day).`
                  : `Add up to ${remainingSelections} more ${
                      remainingSelections === 1 ? "place" : "places"
                    } (max ${MAX_POIS_PER_DAY} per day).`}
              </p>

              <p className="selections-tip">
                Offpeak spreads your places evenly across your {tripDayCount}{" "}
                {tripDayCount === 1 ? "day" : "days"} and puts each one in its
                quietest window.
              </p>

              {unsavedItinerary === null ? (
                <button
                  type="button"
                  className="generate-itinerary-button"
                  onClick={buildItinerary}
                  disabled={selectedPois.length === 0 || isBuilding}
                >
                  {isBuilding
                    ? "Building your itinerary..."
                    : "Generate itinerary →"}
                </button>
              ) : (
                <button
                  type="button"
                  className="generate-itinerary-button"
                  onClick={retrySave}
                  disabled={isBuilding}
                >
                  {isBuilding ? "Saving..." : "Retry saving your itinerary"}
                </button>
              )}

              {itineraryError && (
                <p className="error-message">{itineraryError}</p>
              )}

              {statusMessage && (
                <p className="success-message">{statusMessage}</p>
              )}
            </aside>
          </section>
        </>
      )}

      {pendingAccessibilityPoi && (
        <div
          className="accessibility-warning-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setPendingAccessibilityPoi(null);
            }
          }}
        >
          <section
            className="accessibility-warning-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="itinerary-accessibility-warning-title"
            aria-describedby="itinerary-accessibility-warning-description"
          >
            <div className="accessibility-warning-icon" aria-hidden="true">
              ♿
            </div>

            <p className="section-eyebrow">Accessibility check</p>

            <h2 id="itinerary-accessibility-warning-title">
              Accessibility information not confirmed
            </h2>

            <p id="itinerary-accessibility-warning-description">
              {`${pendingAccessibilityPoi.name} does not have confirmed wheelchair-accessibility information. Missing information does not necessarily mean the attraction is inaccessible.`}
            </p>

            <div className="accessibility-warning-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPendingAccessibilityPoi(null)}
              >
                Choose another place
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const slug = pendingAccessibilityPoi.slug;
                  setPendingAccessibilityPoi(null);
                  addPoiWithoutAccessibilityWarning(slug);
                }}
              >
                Add anyway
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default MyItinerary;
