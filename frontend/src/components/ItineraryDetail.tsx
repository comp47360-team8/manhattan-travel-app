import { useEffect, useState } from "react";

import ItineraryTimeline from "./ItineraryTimeline";
import { apiFetch, isAuthenticationError } from "../api";
import {
  groupStopsByDay,
  hasOverlappingStops,
  parseIsoDate,
} from "../itinerary";

import type { Poi, SavedItinerary } from "../types";

type ItineraryDetailProps = {
  itineraryId: string;
  pois: Poi[];
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
  onBackToPlanner,
}: ItineraryDetailProps) {
  const [itinerary, setItinerary] = useState<SavedItinerary | null>(null);
  const [activeDayNumber, setActiveDayNumber] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

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

  const scheduleHasOverlap = hasOverlappingStops(itinerary.stops);
  const dayCount = groupStopsByDay(itinerary.stops).length;

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

      {scheduleHasOverlap && (
        <p className="fallback-message" role="status">
          <strong>Scheduling conflict:</strong> Some places share an
          overlapping time window.
        </p>
      )}

      <ItineraryTimeline
        stops={itinerary.stops}
        pois={pois}
        activeDayNumber={activeDayNumber}
        onDayChange={setActiveDayNumber}
      />
    </section>
  );
}

export default ItineraryDetail;
