import BusynessChart from "./BusynessChart";
import { accessibilitySummary } from "../accessibility";
import {
  crowdLevelClass,
  formatClockTime,
  formatItineraryDate,
  groupStopsByDay,
} from "../itinerary";
import poiPhotoFallback from "../assets/poi-photo-fallback.svg";

import type { Poi, SavedItineraryStop } from "../types";

/*
  The day-by-day plan used by the itinerary detail page. It was previously
  inlined at the bottom of MyItinerary, which meant a generated plan could only
  ever be read on the page that produced it.
*/

type ItineraryTimelineProps = {
  /*
    Typed as the saved shape, not the generated one: only a persisted itinerary
    is rendered here, and its nullable fields must stay visible to the compiler.
  */
  stops: SavedItineraryStop[];
  /*
    why_this_time is not part of the stop payload, so the full POI list is used
    to look it up by slug.
  */
  pois: Poi[];
  activeDayNumber: number | null;
  onDayChange: (dayNumber: number) => void;
  onRemoveStop: (stopId: string) => void;
  /* Slug of the stop currently being removed, so its button can show progress. */
  removingStopId: string | null;
};

function ItineraryTimeline({
  stops,
  pois,
  activeDayNumber,
  onDayChange,
  onRemoveStop,
  removingStopId,
}: ItineraryTimelineProps) {
  const days = groupStopsByDay(stops);
  const activeDay =
    days.find((day) => day.dayNumber === activeDayNumber) ?? days[0];

  if (days.length === 0) {
    return (
      <p className="fallback-message">
        This itinerary does not contain any scheduled stops.
      </p>
    );
  }

  return (
    <div className="itinerary-plan">
      <div
        className="itinerary-day-tabs"
        role="tablist"
        aria-label="Itinerary days"
      >
        {days.map((day) => {
          const isActive = day.dayNumber === activeDay?.dayNumber;

          return (
            <button
              key={`${day.dayNumber}-${day.visitDate}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? "active" : ""}
              onClick={() => onDayChange(day.dayNumber)}
            >
              <strong>Day {day.dayNumber}</strong>
              <span>{formatItineraryDate(day.visitDate)}</span>
            </button>
          );
        })}
      </div>

      <div className="itinerary-days">
        {days
          .filter((day) => day.dayNumber === activeDay?.dayNumber)
          .map((day) => (
            <section
              className="itinerary-day-group"
              key={`${day.dayNumber}-${day.visitDate}`}
            >
              <header className="itinerary-day-heading">
                <div>
                  {/* No "Day N" eyebrow: the active tab above already says it. */}
                  <h3>{formatItineraryDate(day.visitDate)}</h3>
                </div>

                <span>
                  {day.stops.length}{" "}
                  {day.stops.length === 1 ? "place" : "places"}
                </span>
              </header>

              <div className="itinerary-timeline">
                {day.stops.map((stop) => (
                  <div
                    key={`${stop.slug}-${stop.position}`}
                    className="itinerary-timeline-row"
                  >
                    <div className="timeline-time">
                      <strong>{stop.slot}</strong>
                      <span>
                        {formatClockTime(stop.slot_start)} –{" "}
                        {formatClockTime(stop.slot_end)}
                      </span>

                      {/*
                        The row control lives in the time rail, which has spare
                        room. In the card's meta row it wrapped onto a second
                        line and cost every card ~25px.
                      */}
                      <button
                        type="button"
                        className="timeline-remove-stop"
                        onClick={() => onRemoveStop(stop.stop_id)}
                        disabled={removingStopId === stop.stop_id}
                        aria-label={`Remove ${stop.poi_name} from this itinerary`}
                      >
                        {removingStopId === stop.stop_id
                          ? "Removing..."
                          : "Remove"}
                      </button>
                    </div>

                    <article className="timeline-card">
                      <div className="timeline-card-image">
                        <img
                          src={stop.hero_image_url || poiPhotoFallback}
                          alt=""
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

                      <div className="timeline-card-content">
                        <p className="card-location">
                          {stop.neighborhood}, {stop.borough}
                        </p>

                        <div className="timeline-card-heading">
                          <h3>{stop.poi_name}</h3>
                          <span
                            className={`crowd-level-pill ${crowdLevelClass(
                              stop.crowd_level
                            )}`}
                          >
                            {stop.crowd_level} crowds
                          </span>
                        </div>

                        {/*
                          No "Recommended {slot} window" block here: the time
                          rail on the left already gives the slot and hours, and
                          the pill above gives the crowd level, so it repeated
                          both and cost a stop's worth of vertical space.
                        */}
                        <p className="why-this-time">
                          <strong>Why this time:</strong>{" "}
                          {pois
                            .find((poi) => poi.slug === stop.slug)
                            ?.why_this_time?.trim() ||
                            "Detailed recommendation data is not available for this stop."}
                        </p>

                        <div className="timeline-card-details">
                          <span>
                            Suggested duration: {stop.suggested_duration}{" "}
                            minutes
                          </span>

                          {/*
                            accessibility comes straight from the POI's
                            nullable accessibility_labels column, so a saved
                            stop can send null here where a freshly generated
                            one always sends an array. Only confirmed labels
                            are shown, because the chip reads "Accessible" and
                            partial access does not qualify.
                          */}
                          {accessibilitySummary(stop.accessibility) && (
                            <span>
                              Accessible:{" "}
                              {accessibilitySummary(stop.accessibility)}
                            </span>
                          )}

                          {/* Shares the meta row rather than taking its own. */}
                          <a
                            className="poi-details-link timeline-details-link"
                            href={`/explore/${encodeURIComponent(stop.slug)}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View place details ↗
                          </a>
                        </div>

                        {stop.flags.length > 0 && (
                          <div className="stop-flags">
                            {stop.flags.map((flag) => (
                              <span key={flag}>{flag}</span>
                            ))}
                          </div>
                        )}

                        {/*
                          Collapsed by default. Expanded, the chart is 161px --
                          repeated on every stop it pushed the second place of
                          the day off a laptop screen, which is the one thing a
                          day view has to show. The crowd pill above already
                          gives the level for the scheduled window, so the full
                          24-hour breakdown is opt-in.
                        */}
                        {stop.busyness_for_day.length > 0 ? (
                          <details className="timeline-forecast">
                            <summary>Crowd by hour</summary>

                            <BusynessChart
                              hours={stop.busyness_for_day}
                              poiName={stop.poi_name}
                            />
                          </details>
                        ) : (
                          <p className="fallback-message">
                            Hourly crowd forecast is not available for this
                            stop.
                          </p>
                        )}
                      </div>
                    </article>
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>
    </div>
  );
}

export default ItineraryTimeline;
