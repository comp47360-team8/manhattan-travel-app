import { useEffect, useState } from "react";

import { apiFetch, isAuthenticationError } from "../api";
import poiPhotoFallback from "../assets/poi-photo-fallback.svg";

import type { SavedItineraryPreview } from "../types";

type MyTripsCarouselProps = {
  onOpenTrip: (itineraryId: string) => void;
};

/*
  Dates read as 2026/07/15 here rather than the long form used inside a plan.
  A card is scanned, not read, so the compact numeric form keeps the two dates
  on one line at every card width.
*/
function formatCardDate(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
}

/*
  The trips a user already built, shown on the planner itself. hero_image_url
  arrives from the backend as the first stop's photo, so no extra POI lookup is
  needed to give each trip a face.
*/
function MyTripsCarousel({ onOpenTrip }: MyTripsCarouselProps) {
  const [trips, setTrips] = useState<SavedItineraryPreview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadTrips() {
      try {
        setIsLoading(true);
        setMessage("");

        const data = await apiFetch<SavedItineraryPreview[]>(
          "/api/users/me/saved-itineraries"
        );

        if (!isCancelled) {
          setTrips(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load saved itineraries:", error);

        if (isCancelled) {
          return;
        }

        setMessage(
          isAuthenticationError(error)
            ? "Log in to see the trips you have created."
            : "Your trips could not be loaded."
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadTrips();

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <section className="my-trips-section">
      <div className="my-trips-heading">
        <h2>My Trips</h2>

        <p>
          Review or continue editing your previously created Manhattan
          itineraries.
        </p>
      </div>

      {isLoading && <p className="loading-message">Loading your trips...</p>}

      {!isLoading && message && <p className="fallback-message">{message}</p>}

      {!isLoading && message === "" && trips.length === 0 && (
        <p className="fallback-message">
          No trips yet. Pick your dates below to build your first one.
        </p>
      )}

      {!isLoading && trips.length > 0 && (
        <ul className="my-trips-carousel">
          {trips.map((trip) => (
            <li className="my-trip-card" key={trip.itinerary_id}>
              <a
                href={`/itinerary/${encodeURIComponent(trip.itinerary_id)}`}
                onClick={(event) => {
                  /*
                    A real href keeps the card openable in a new tab, but a
                    plain left click stays inside the app.
                  */
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.button !== 0
                  ) {
                    return;
                  }

                  event.preventDefault();
                  onOpenTrip(trip.itinerary_id);
                }}
              >
                <span className="my-trip-card-image">
                  <img
                    src={trip.hero_image_url || poiPhotoFallback}
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
                </span>

                <span className="my-trip-card-name">{trip.trip_name}</span>

                <span className="my-trip-card-dates">
                  {formatCardDate(trip.start_date)} –{" "}
                  {formatCardDate(trip.end_date)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MyTripsCarousel;
