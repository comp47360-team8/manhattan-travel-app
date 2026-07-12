import { useEffect, useState } from "react";

import { apiFetch } from "../api";

import type {
  AddStopRequest,
  ApiMessageResponse,
  Poi,
  SavedItinerary,
  SavedItineraryPreview,
} from "../types";

type SavedItinerariesProps = {
  onLoginRequired?: () => void;
  pois: Poi[];
};

type SavedView = "places" | "itineraries";

type ConfirmationAction =
  | {
      kind: "delete-itinerary";
      itineraryId: string;
      itemName: string;
    }
  | {
      kind: "remove-stop";
      stopId: string;
      itemName: string;
    }
  | null;

function formatDate(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

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

function SavedItineraries({
  onLoginRequired,
  pois,
}: SavedItinerariesProps) {
  /*
    The Saved page contains two related account areas:
    saved attractions and saved itineraries.
  */
  const [activeView, setActiveView] =
    useState<SavedView>("places");

  /*
    Saved attractions returned by:
    GET /api/users/me/saved-pois
  */
  const [savedPlaces, setSavedPlaces] = useState<Poi[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] =
    useState(true);
  const [removingPlaceSlug, setRemovingPlaceSlug] =
    useState<string | null>(null);
  const [savedPlaceSearch, setSavedPlaceSearch] =
    useState("");

  /*
    Saved itinerary previews returned by:
    GET /api/users/me/saved-itineraries
  */
  const [savedItineraries, setSavedItineraries] =
    useState<SavedItineraryPreview[]>([]);

  /*
    Full saved itinerary used when the user opens one plan.
  */
  const [selectedItinerary, setSelectedItinerary] =
    useState<SavedItinerary | null>(null);

  const [isLoadingItineraries, setIsLoadingItineraries] =
    useState(true);
  const [isLoadingDetails, setIsLoadingDetails] =
    useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  /*
    Saved itinerary editing state.
  */
  const [poiSearchTerm, setPoiSearchTerm] =
    useState("");
  const [addingPoiSlug, setAddingPoiSlug] =
    useState<string | null>(null);
  const [removingStopId, setRemovingStopId] =
    useState<string | null>(null);

  /*
    Shared page feedback.
  */
  const [errorMessage, setErrorMessage] =
    useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  /*
    I use an in-app confirmation dialog so destructive actions match
    the rest of the design instead of using the browser's plain alert box.
  */
  const [confirmationAction, setConfirmationAction] =
    useState<ConfirmationAction>(null);

  const filteredSavedPlaces = savedPlaces.filter(
    (poi) => {
      const search = savedPlaceSearch
        .trim()
        .toLowerCase();

      if (!search) {
        return true;
      }

      return (
        poi.name.toLowerCase().includes(search) ||
        poi.type.toLowerCase().includes(search) ||
        poi.borough.toLowerCase().includes(search) ||
        (poi.neighborhood ?? "")
          .toLowerCase()
          .includes(search)
      );
    }
  );

  /*
    POIs which can be added to the selected itinerary.

    Places already included in the itinerary are removed from
    these search results.
  */
  const availablePois = pois
    .filter((poi) => {
      const search = poiSearchTerm
        .trim()
        .toLowerCase();

      return (
        poi.name.toLowerCase().includes(search) ||
        poi.type.toLowerCase().includes(search) ||
        poi.borough.toLowerCase().includes(search) ||
        (poi.neighborhood ?? "")
          .toLowerCase()
          .includes(search)
      );
    })
    .filter((poi) => {
      if (!selectedItinerary) {
        return true;
      }

      return !selectedItinerary.stops.some(
        (stop) => stop.slug === poi.slug
      );
    })
    .slice(0, 6);

  function handleAuthenticationFailure(
    error: unknown
  ): boolean {
    if (!isAuthenticationError(error)) {
      return false;
    }

    setErrorMessage(
      "You need to log in to view your saved items."
    );

    onLoginRequired?.();
    return true;
  }

  async function loadSavedPlaces() {
    try {
      setIsLoadingPlaces(true);

      const data = await apiFetch<Poi[]>(
        "/api/users/me/saved-pois"
      );

      setSavedPlaces(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        "Failed to load saved places:",
        error
      );

      if (!handleAuthenticationFailure(error)) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Saved places could not be loaded."
        );
      }
    } finally {
      setIsLoadingPlaces(false);
    }
  }

  async function loadSavedItineraries() {
    try {
      setIsLoadingItineraries(true);

      const data =
        await apiFetch<SavedItineraryPreview[]>(
          "/api/users/me/saved-itineraries"
        );

      setSavedItineraries(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      console.error(
        "Failed to load saved itineraries:",
        error
      );

      if (!handleAuthenticationFailure(error)) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Saved itineraries could not be loaded."
        );
      }
    } finally {
      setIsLoadingItineraries(false);
    }
  }

  /*
    Load both Saved-page collections when the page opens.
  */
  useEffect(() => {
    void Promise.all([
      loadSavedPlaces(),
      loadSavedItineraries(),
    ]);
  }, []);

  async function refreshSavedContent() {
    setErrorMessage("");
    setSuccessMessage("");

    await Promise.all([
      loadSavedPlaces(),
      loadSavedItineraries(),
    ]);
  }

  async function removeSavedPlace(slug: string) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setRemovingPlaceSlug(slug);

      const response =
        await apiFetch<ApiMessageResponse>(
          `/api/pois/${slug}/save`,
          {
            method: "DELETE",
          }
        );

      setSavedPlaces((currentPlaces) =>
        currentPlaces.filter(
          (poi) => poi.slug !== slug
        )
      );

      setSuccessMessage(
        response.message ||
          "Attraction removed from your saved places."
      );
    } catch (error) {
      console.error(
        "Failed to remove saved place:",
        error
      );

      if (!handleAuthenticationFailure(error)) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The saved attraction could not be removed."
        );
      }
    } finally {
      setRemovingPlaceSlug(null);
    }
  }

  async function openItinerary(
    itineraryId: string
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setIsLoadingDetails(true);

      const data =
        await apiFetch<SavedItinerary>(
          `/api/users/me/saved-itineraries/${itineraryId}`
        );

      setSelectedItinerary(data);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error(
        "Failed to load itinerary details:",
        error
      );

      if (!handleAuthenticationFailure(error)) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The itinerary could not be opened."
        );
      }
    } finally {
      setIsLoadingDetails(false);
    }
  }

  async function deleteItinerary(
    itineraryId: string
  ) {
    setConfirmationAction(null);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setDeletingId(itineraryId);

      const response =
        await apiFetch<ApiMessageResponse>(
          `/api/itinerary/${itineraryId}`,
          {
            method: "DELETE",
          }
        );

      setSavedItineraries(
        (currentItineraries) =>
          currentItineraries.filter(
            (itinerary) =>
              itinerary.itinerary_id !==
              itineraryId
          )
      );

      if (
        selectedItinerary?.itinerary_id ===
        itineraryId
      ) {
        setSelectedItinerary(null);
      }

      setSuccessMessage(
        response.message ||
          "Itinerary deleted."
      );
    } catch (error) {
      console.error(
        "Failed to delete itinerary:",
        error
      );

      if (!handleAuthenticationFailure(error)) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The itinerary could not be deleted."
        );
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function addPoiToSavedItinerary(
    slug: string
  ) {
    if (!selectedItinerary) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    const requestBody: AddStopRequest = {
      slug,
    };

    try {
      setAddingPoiSlug(slug);

      const updatedItinerary =
        await apiFetch<SavedItinerary>(
          `/api/itinerary/${selectedItinerary.itinerary_id}/stops`,
          {
            method: "POST",
            body: JSON.stringify(requestBody),
          }
        );

      setSelectedItinerary(updatedItinerary);
      setPoiSearchTerm("");
      setSuccessMessage(
        "Attraction added to the itinerary."
      );
    } catch (error) {
      console.error(
        "Failed to add attraction:",
        error
      );

      if (!handleAuthenticationFailure(error)) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The attraction could not be added."
        );
      }
    } finally {
      setAddingPoiSlug(null);
    }
  }

  async function removeStopFromSavedItinerary(
    stopId: string
  ) {
    if (!selectedItinerary) {
      return;
    }

    setConfirmationAction(null);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      setRemovingStopId(stopId);

      const updatedItinerary =
        await apiFetch<SavedItinerary>(
          `/api/itinerary/${selectedItinerary.itinerary_id}/stops/${stopId}`,
          {
            method: "DELETE",
          }
        );

      setSelectedItinerary(updatedItinerary);
      setSuccessMessage(
        "Attraction removed from the itinerary."
      );
    } catch (error) {
      console.error(
        "Failed to remove itinerary stop:",
        error
      );

      if (!handleAuthenticationFailure(error)) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The attraction could not be removed."
        );
      }
    } finally {
      setRemovingStopId(null);
    }
  }

  return (
    <section className="saved-itineraries-page">
      <header className="saved-itineraries-heading">
        <div>
          <p className="section-eyebrow">
            Your collection
          </p>

          <h1>Saved</h1>

          <p>
            Keep your favourite Manhattan places
            and completed trip plans together in
            one account.
          </p>
        </div>

        <button
          type="button"
          onClick={refreshSavedContent}
        >
          Refresh
        </button>
      </header>

      <div
        className="saved-content-tabs"
        role="tablist"
        aria-label="Saved content"
      >
        <button
          type="button"
          role="tab"
          aria-selected={
            activeView === "places"
          }
          className={
            activeView === "places"
              ? "active"
              : ""
          }
          onClick={() => {
            setActiveView("places");
            setSelectedItinerary(null);
            setErrorMessage("");
            setSuccessMessage("");
          }}
        >
          Saved places
          <span>{savedPlaces.length}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={
            activeView === "itineraries"
          }
          className={
            activeView === "itineraries"
              ? "active"
              : ""
          }
          onClick={() => {
            setActiveView("itineraries");
            setErrorMessage("");
            setSuccessMessage("");
          }}
        >
          Saved itineraries
          <span>{savedItineraries.length}</span>
        </button>
      </div>

      {errorMessage && (
        <p className="error-message">
          {errorMessage}
        </p>
      )}

      {successMessage && (
        <p className="success-message">
          {successMessage}
        </p>
      )}

      {activeView === "places" && (
        <section
          className="saved-places-section"
          role="tabpanel"
        >
          <div className="saved-section-heading">
            <div>
              <p className="section-eyebrow">
                Personal collection
              </p>

              <h2>Saved places</h2>

              <p>
                Attractions you marked for future
                visits and itinerary planning.
              </p>
            </div>

            {savedPlaces.length > 0 && (
              <label className="saved-place-search">
                <span aria-hidden="true">⌕</span>

                <input
                  type="search"
                  placeholder="Search saved places..."
                  value={savedPlaceSearch}
                  onChange={(event) =>
                    setSavedPlaceSearch(
                      event.target.value
                    )
                  }
                />
              </label>
            )}
          </div>

          {isLoadingPlaces && (
            <p className="loading-message">
              Loading saved places...
            </p>
          )}

          {!isLoadingPlaces &&
            savedPlaces.length === 0 && (
              <section className="saved-itineraries-empty">
                <div
                  className="saved-empty-icon"
                  aria-hidden="true"
                >
                  ♡
                </div>

                <h2>No saved places yet</h2>

                <p>
                  Save an attraction from Explore
                  and it will appear here.
                </p>
              </section>
            )}

          {!isLoadingPlaces &&
            savedPlaces.length > 0 &&
            filteredSavedPlaces.length === 0 && (
              <p className="fallback-message">
                No saved places match your search.
              </p>
            )}

          {!isLoadingPlaces &&
            filteredSavedPlaces.length > 0 && (
              <div className="saved-places-grid">
                {filteredSavedPlaces.map(
                  (poi) => (
                    <article
                      className="saved-place-card"
                      key={poi.slug}
                    >
                      <div className="saved-place-image">
                        <img
                          src={
                            poi.hero_image_url ||
                            "https://placehold.co/700x430?text=Manhattan"
                          }
                          alt={poi.name}
                          loading="lazy"
                        />

                        <button
                          type="button"
                          className="saved-place-remove"
                          onClick={() =>
                            removeSavedPlace(
                              poi.slug
                            )
                          }
                          disabled={
                            removingPlaceSlug ===
                            poi.slug
                          }
                          aria-label={`Remove ${poi.name} from saved places`}
                        >
                          {removingPlaceSlug ===
                          poi.slug
                            ? "…"
                            : "♥"}
                        </button>
                      </div>

                      <div className="saved-place-body">
                        <p className="card-location">
                          {poi.neighborhood ||
                            poi.borough ||
                            "Manhattan"}
                        </p>

                        <h3>{poi.name}</h3>

                        <p className="saved-place-type">
                          {poi.type}
                        </p>

                        <div className="saved-place-meta">
                          <span>
                            {poi.current_busyness ||
                              "Crowd update pending"}
                          </span>

                          {poi.accessibility_labels &&
                            poi
                              .accessibility_labels
                              .length > 0 && (
                              <span>
                                ♿ Accessibility
                                information
                              </span>
                            )}
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
        </section>
      )}

      {activeView === "itineraries" && (
        <section
          className="saved-itinerary-list-section"
          role="tabpanel"
        >
          {!selectedItinerary && (
            <>
              <div className="saved-section-heading">
                <div>
                  <p className="section-eyebrow">
                    Your trip plans
                  </p>

                  <h2>Saved itineraries</h2>

                  <p>
                    Open, review, edit or remove
                    previously generated journeys.
                  </p>
                </div>
              </div>

              {isLoadingItineraries && (
                <p className="loading-message">
                  Loading saved itineraries...
                </p>
              )}

              {!isLoadingItineraries &&
                savedItineraries.length === 0 && (
                  <section className="saved-itineraries-empty">
                    <div
                      className="saved-empty-icon"
                      aria-hidden="true"
                    >
                      ◫
                    </div>

                    <h2>
                      No saved itineraries yet
                    </h2>

                    <p>
                      Generate an itinerary from My
                      Itinerary and save it to your
                      account.
                    </p>
                  </section>
                )}

              {!isLoadingItineraries &&
                savedItineraries.length > 0 && (
                  <div className="saved-itineraries-grid">
                    {savedItineraries.map(
                      (itinerary) => (
                        <article
                          className="saved-itinerary-card"
                          key={
                            itinerary.itinerary_id
                          }
                        >
                          <img
                            src={
                              itinerary.hero_image_url ||
                              "https://placehold.co/700x430?text=Manhattan+Trip"
                            }
                            alt={
                              itinerary.trip_name
                            }
                          />

                          <div className="saved-itinerary-card-body">
                            <p className="section-eyebrow">
                              {
                                itinerary.number_of_places
                              }{" "}
                              places
                            </p>

                            <h2>
                              {
                                itinerary.trip_name
                              }
                            </h2>

                            <p>
                              {formatDate(
                                itinerary.start_date
                              )}{" "}
                              –{" "}
                              {formatDate(
                                itinerary.end_date
                              )}
                            </p>

                            <div className="saved-itinerary-actions">
                              <button
                                type="button"
                                onClick={() =>
                                  openItinerary(
                                    itinerary.itinerary_id
                                  )
                                }
                                disabled={
                                  isLoadingDetails
                                }
                              >
                                View itinerary
                              </button>

                              <button
                                type="button"
                                className="danger-button"
                                onClick={() =>
                                  setConfirmationAction({
                                    kind: "delete-itinerary",
                                    itineraryId: itinerary.itinerary_id,
                                    itemName: itinerary.trip_name,
                                  })
                                }
                                disabled={
                                  deletingId ===
                                  itinerary.itinerary_id
                                }
                              >
                                {deletingId ===
                                itinerary.itinerary_id
                                  ? "Deleting..."
                                  : "Delete"}
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                )}
            </>
          )}

          {isLoadingDetails && (
            <p className="loading-message">
              Opening itinerary...
            </p>
          )}

          {selectedItinerary &&
            !isLoadingDetails && (
              <section className="saved-itinerary-detail">
                <div className="saved-itinerary-detail-heading">
                  <div>
                    <p className="section-eyebrow">
                      Saved plan
                    </p>

                    <h2>
                      {
                        selectedItinerary.trip_name
                      }
                    </h2>

                    <p>
                      Trip ending{" "}
                      {formatDate(
                        selectedItinerary.end_date
                      )}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSelectedItinerary(null)
                    }
                  >
                    Back to itineraries
                  </button>
                </div>

                <div className="itinerary-timeline">
                  {selectedItinerary.stops.map(
                    (stop, index) => (
                      <div
                        className="itinerary-timeline-row"
                        key={`${stop.stop_id}-${index}`}
                      >
                        <div className="timeline-time">
                          {stop.slot_start.slice(
                            0,
                            5
                          )}
                          –
                          {stop.slot_end.slice(
                            0,
                            5
                          )}
                        </div>

                        <article className="timeline-card">
                          <p className="card-location">
                            Day {stop.day_number} ·{" "}
                            {formatDate(
                              stop.visit_date
                            )}
                          </p>

                          <h3>
                            {stop.poi_name}
                          </h3>

                          <p className="best-time">
                            {stop.slot} ·{" "}
                            {stop.crowd_level}
                          </p>

                          <p className="why-this-time">
                            {stop.neighborhood},{" "}
                            {stop.borough}
                          </p>

                          <p className="why-this-time">
                            Suggested visit:{" "}
                            {
                              stop.suggested_duration
                            }{" "}
                            minutes
                          </p>

                          {stop.flags.length >
                            0 && (
                            <div className="stop-flags">
                              {stop.flags.map(
                                (flag) => (
                                  <span key={flag}>
                                    {flag}
                                  </span>
                                )
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            className="remove-stop-button"
                            onClick={() =>
                              setConfirmationAction({
                                kind: "remove-stop",
                                stopId: stop.stop_id,
                                itemName: stop.poi_name,
                              })
                            }
                            disabled={
                              removingStopId ===
                              stop.stop_id
                            }
                          >
                            {removingStopId ===
                            stop.stop_id
                              ? "Removing..."
                              : "Remove from itinerary"}
                          </button>

                          {stop.busyness_for_day
                            .length > 0 && (
                            <div
                              className="mini-busyness-chart"
                              aria-label={`Hourly busyness forecast for ${stop.poi_name}`}
                            >
                              {stop.busyness_for_day
                                .slice(0, 24)
                                .map((hour) => (
                                  <div
                                    className="mini-busyness-column"
                                    key={
                                      hour.hour_of_day
                                    }
                                    title={`${hour.hour_of_day}:00 — ${hour.busyness}% busy`}
                                  >
                                    <div
                                      className="mini-busyness-bar"
                                      style={{
                                        height: `${Math.max(
                                          6,
                                          Math.min(
                                            hour.busyness,
                                            100
                                          )
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                ))}
                            </div>
                          )}
                        </article>
                      </div>
                    )
                  )}
                </div>

                <section className="saved-itinerary-editor">
                  <div className="saved-itinerary-editor-heading">
                    <p className="section-eyebrow">
                      Edit itinerary
                    </p>

                    <h3>
                      Add another attraction
                    </h3>

                    <p>
                      Add a new place and the
                      backend will recalculate the
                      itinerary schedule.
                    </p>
                  </div>

                  <input
                    className="search"
                    type="search"
                    placeholder="Search attractions to add..."
                    value={poiSearchTerm}
                    onChange={(event) =>
                      setPoiSearchTerm(
                        event.target.value
                      )
                    }
                  />

                  {poiSearchTerm.trim() !==
                    "" && (
                    <div className="saved-itinerary-poi-results">
                      {availablePois.length ===
                      0 ? (
                        <p className="fallback-message">
                          No available attractions
                          match your search.
                        </p>
                      ) : (
                        availablePois.map(
                          (poi) => (
                            <article
                              className="itinerary-poi-row"
                              key={poi.slug}
                            >
                              <div>
                                <strong>
                                  {poi.name}
                                </strong>

                                <p>
                                  {poi.neighborhood ||
                                    poi.borough ||
                                    "Manhattan"}
                                </p>
                              </div>

                              <button
                                type="button"
                                onClick={() =>
                                  addPoiToSavedItinerary(
                                    poi.slug
                                  )
                                }
                                disabled={
                                  addingPoiSlug ===
                                  poi.slug
                                }
                              >
                                {addingPoiSlug ===
                                poi.slug
                                  ? "Adding..."
                                  : "Add"}
                              </button>
                            </article>
                          )
                        )
                      )}
                    </div>
                  )}
                </section>
              </section>
            )}
        </section>
      )}

      {confirmationAction && (
        <div
          className="saved-confirmation-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmationAction(null);
            }
          }}
        >
          <section
            className="saved-confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="saved-confirmation-title"
            aria-describedby="saved-confirmation-description"
          >
            <div className="saved-confirmation-icon" aria-hidden="true">
              !
            </div>

            <p className="section-eyebrow">Confirm action</p>

            <h2 id="saved-confirmation-title">
              {confirmationAction.kind === "delete-itinerary"
                ? "Delete this itinerary?"
                : "Remove this attraction?"}
            </h2>

            <p id="saved-confirmation-description">
              {confirmationAction.kind === "delete-itinerary"
                ? `“${confirmationAction.itemName}” will be permanently removed from your saved itineraries.`
                : `“${confirmationAction.itemName}” will be removed from this itinerary and the schedule will be recalculated.`}
            </p>

            <div className="saved-confirmation-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setConfirmationAction(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  if (confirmationAction.kind === "delete-itinerary") {
                    void deleteItinerary(confirmationAction.itineraryId);
                    return;
                  }

                  void removeStopFromSavedItinerary(confirmationAction.stopId);
                }}
              >
                {confirmationAction.kind === "delete-itinerary"
                  ? "Delete itinerary"
                  : "Remove attraction"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

export default SavedItineraries;