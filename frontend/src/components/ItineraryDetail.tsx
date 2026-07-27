import { useEffect, useState } from "react";

import ItineraryTimeline from "./ItineraryTimeline";
import { apiFetch, isAuthenticationError } from "../api";
import { isWheelchairAccessible } from "../accessibility";
import { groupStopsByDay, parseIsoDate } from "../itinerary";
import poiPhotoFallback from "../assets/poi-photo-fallback.svg";

import type { AddStopRequest, Poi, SavedItinerary } from "../types";

type ItineraryDetailProps = {
  itineraryId: string;
  pois: Poi[];
  preferAccessiblePlaces: boolean;
  onBackToPlanner: () => void;
};

function formatTripDate(dateValue: string): string {
  const date = parseIsoDate(dateValue);

  if (!date) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/*
  A saved itinerary now has its own address. The plan is always re-read from the
  backend rather than handed over in navigation state, so arriving here from the
  My Trips carousel and arriving straight after generating both take one path.
*/
function ItineraryDetail({
  itineraryId,
  pois,
  preferAccessiblePlaces,
  onBackToPlanner,
}: ItineraryDetailProps) {
  const [itinerary, setItinerary] = useState<SavedItinerary | null>(null);
  const [activeDayNumber, setActiveDayNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  /* Editing state. Both endpoints return the recalculated itinerary. */
  const [poiSearchTerm, setPoiSearchTerm] = useState("");
  const [addingPoiSlug, setAddingPoiSlug] = useState<string | null>(null);
  const [removingStopId, setRemovingStopId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadItinerary() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await apiFetch<SavedItinerary>(
          `/api/users/me/saved-itineraries/${encodeURIComponent(itineraryId)}`
        );

        if (isCancelled) {
          return;
        }

        setItinerary(data);
        setActiveDayNumber(groupStopsByDay(data.stops)[0]?.dayNumber ?? null);
      } catch (error) {
        console.error("Failed to load the itinerary:", error);

        if (isCancelled) {
          return;
        }

        if (isAuthenticationError(error)) {
          setErrorMessage("Please log in to view this itinerary.");
        } else if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage("This itinerary could not be loaded.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadItinerary();

    return () => {
      isCancelled = true;
    };
  }, [itineraryId]);

  /*
    Adding and removing both re-run scheduling on the backend and hand back the
    whole itinerary, so the response replaces local state rather than being
    patched into it. That is also why the day tabs are re-derived afterwards:
    a change can add or drop a day.
  */
  function applyUpdatedItinerary(updated: SavedItinerary, message: string) {
    setItinerary(updated);

    const days = groupStopsByDay(updated.stops);
    const stillHasActiveDay = days.some(
      (day) => day.dayNumber === activeDayNumber
    );

    if (!stillHasActiveDay) {
      setActiveDayNumber(days[0]?.dayNumber ?? null);
    }

    setEditMessage(message);
  }

  function reportEditFailure(error: unknown, fallback: string) {
    console.error(fallback, error);

    setEditMessage("");
    setErrorMessage(
      isAuthenticationError(error)
        ? "Please log in to edit this itinerary."
        : error instanceof Error
          ? error.message
          : fallback
    );
  }

  async function addPoiToItinerary(slug: string) {
    setErrorMessage("");
    setEditMessage("");

    const requestBody: AddStopRequest = { slug };

    try {
      setAddingPoiSlug(slug);

      const updated = await apiFetch<SavedItinerary>(
        `/api/itinerary/${encodeURIComponent(itineraryId)}/stops`,
        {
          method: "POST",
          body: JSON.stringify(requestBody),
          // Adding re-runs the scheduler, so it needs generation's headroom.
          signal: AbortSignal.timeout(60_000),
        }
      );

      applyUpdatedItinerary(updated, "Place added and your days rescheduled.");
      setPoiSearchTerm("");
    } catch (error) {
      reportEditFailure(error, "The place could not be added.");
    } finally {
      setAddingPoiSlug(null);
    }
  }

  async function removeStopFromItinerary(stopId: string) {
    setErrorMessage("");
    setEditMessage("");

    try {
      setRemovingStopId(stopId);

      const updated = await apiFetch<SavedItinerary>(
        `/api/itinerary/${encodeURIComponent(itineraryId)}/stops/${encodeURIComponent(stopId)}`,
        {
          method: "DELETE",
          signal: AbortSignal.timeout(60_000),
        }
      );

      applyUpdatedItinerary(
        updated,
        "Place removed and your days rescheduled."
      );
    } catch (error) {
      reportEditFailure(error, "The place could not be removed.");
    } finally {
      setRemovingStopId(null);
    }
  }

  if (isLoading) {
    return (
      <section className="itinerary-detail">
        <p className="loading-message">Opening your itinerary...</p>
      </section>
    );
  }

  if (errorMessage || itinerary === null) {
    return (
      <section className="itinerary-detail">
        <p className="error-message">
          {errorMessage || "This itinerary could not be loaded."}
        </p>

        <button
          type="button"
          className="secondary-button"
          onClick={onBackToPlanner}
        >
          ← Back to My Itinerary
        </button>
      </section>
    );
  }

  const dayCount = groupStopsByDay(itinerary.stops).length;
  const search = poiSearchTerm.trim().toLowerCase();

  /*
    Places already in the plan are excluded so the list only ever offers real
    additions. The backend rejects a duplicate slug with a 409 anyway.
  */
  const availablePois = pois
    .filter(
      (poi) => !itinerary.stops.some((stop) => stop.slug === poi.slug)
    )
    .filter(
      (poi) =>
        poi.name.toLowerCase().includes(search) ||
        poi.type.toLowerCase().includes(search) ||
        poi.borough.toLowerCase().includes(search) ||
        (poi.neighborhood ?? "").toLowerCase().includes(search)
    )
    .sort((firstPoi, secondPoi) =>
      preferAccessiblePlaces
        ? Number(isWheelchairAccessible(secondPoi)) -
          Number(isWheelchairAccessible(firstPoi))
        : 0
    )
    .slice(0, 6);

  return (
    <section className="itinerary-detail">
      <div className="itinerary-detail-heading">
        <button
          type="button"
          className="itinerary-detail-back"
          onClick={onBackToPlanner}
        >
          ← My Itinerary
        </button>

        <h1>{itinerary.trip_name}</h1>

        <p className="itinerary-detail-meta">
          {itinerary.start_date && (
            <>{formatTripDate(itinerary.start_date)} – </>
          )}
          {formatTripDate(itinerary.end_date)}
          <span aria-hidden="true"> · </span>
          {dayCount} {dayCount === 1 ? "day" : "days"}
          <span aria-hidden="true"> · </span>
          {itinerary.stops.length}{" "}
          {itinerary.stops.length === 1 ? "place" : "places"}
        </p>
      </div>

      {/* Backend warnings remain visible without hiding valid stops. */}
      {itinerary.warning?.trim() && (
        <p className="fallback-message" role="status">
          <strong>Scheduling note:</strong> {itinerary.warning}
        </p>
      )}

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {editMessage && (
        <p className="success-message" role="status">
          {editMessage}
        </p>
      )}

      {/*
        Collapsed by default. Expanded it costs about 150px, which is the
        difference between seeing two stops of a day on a laptop and seeing one.
        Editing is occasional; reading the plan is the common case.
      */}
      <details className="itinerary-detail-editor">
        <summary>+ Add a place</summary>

        <div className="itinerary-detail-editor-heading">
          <p>
            Adding or removing a place reschedules the whole trip around the
            quietest windows.
          </p>
        </div>

        <div className="search-field itinerary-search-field">
          <span className="search-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="11" cy="11" r="6" />
              <path d="m16 16 4 4" />
            </svg>
          </span>

          <input
            className="search"
            type="search"
            value={poiSearchTerm}
            placeholder="Search places to add..."
            aria-label="Search places to add to this itinerary"
            onChange={(event) => setPoiSearchTerm(event.target.value)}
          />

          {poiSearchTerm.trim() && (
            <button
              type="button"
              className="search-clear-button"
              onClick={() => setPoiSearchTerm("")}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {poiSearchTerm.trim() !== "" && (
          <div className="itinerary-detail-poi-results">
            {availablePois.length === 0 ? (
              <p className="fallback-message">
                No available places match your search.
              </p>
            ) : (
              availablePois.map((poi) => (
                <div className="itinerary-poi-row" key={poi.slug}>
                  <div className="itinerary-poi-identity">
                    <div className="itinerary-poi-thumbnail" aria-hidden="true">
                      <img
                        src={poi.hero_image_url || poiPhotoFallback}
                        alt=""
                        loading="lazy"
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
                    </div>

                    <div>
                      <strong>{poi.name}</strong>
                      <p>{poi.neighborhood || poi.borough || "Manhattan"}</p>
                    </div>
                  </div>

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

                    <button
                      type="button"
                      className="itinerary-add-button"
                      onClick={() => addPoiToItinerary(poi.slug)}
                      disabled={addingPoiSlug !== null}
                    >
                      {addingPoiSlug === poi.slug ? "Adding..." : "Add to trip"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </details>

      <ItineraryTimeline
        stops={itinerary.stops}
        pois={pois}
        activeDayNumber={activeDayNumber}
        onDayChange={setActiveDayNumber}
        onRemoveStop={removeStopFromItinerary}
        removingStopId={removingStopId}
      />
    </section>
  );
}

export default ItineraryDetail;
