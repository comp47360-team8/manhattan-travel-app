import type { BusynessResponse } from "../types";

type BusynessChartProps = {
  hours: BusynessResponse[];
  poiName: string;
};

function formatHour(hour: number): string {
  const normalisedHour = ((hour % 24) + 24) % 24;

  if (normalisedHour === 0) {
    return "12am";
  }

  if (normalisedHour === 12) {
    return "12pm";
  }

  return normalisedHour < 12
    ? `${normalisedHour}am`
    : `${normalisedHour - 12}pm`;
}

function getBusynessBand(busyness: number): "quiet" | "moderate" | "busy" {
  if (busyness <= 35) {
    return "quiet";
  }

  if (busyness <= 65) {
    return "moderate";
  }

  return "busy";
}

function BusynessChart({ hours, poiName }: BusynessChartProps) {
  const visibleHours = hours.slice(0, 24);

  return (
    <figure
      className="busyness-forecast"
      aria-label={`Hourly crowd forecast for ${poiName}`}
    >
      <div className="busyness-chart-heading">
        <figcaption>Hourly crowd forecast</figcaption>
        <span>Lower bars are quieter</span>
      </div>

      <div className="busyness-chart-legend" aria-label="Crowd level legend">
        <span><i className="quiet" /> Quiet 0–35%</span>
        <span><i className="moderate" /> Moderate 36–65%</span>
        <span><i className="busy" /> Busy 66–100%</span>
      </div>

      <div className="mini-busyness-chart">
        {visibleHours.map((hour, index) => {
          const showTimeLabel =
            visibleHours.length <= 12 ||
            index % 3 === 0 ||
            index === visibleHours.length - 1;

          return (
            <div
              key={hour.hour_of_day}
              className="mini-busyness-column"
              title={`${formatHour(hour.hour_of_day)} — ${hour.busyness}% busy`}
            >
              <div className="mini-busyness-bar-area">
                <div
                  className={`mini-busyness-bar ${getBusynessBand(hour.busyness)}`}
                  style={{
                    height: `${Math.max(6, Math.min(hour.busyness, 100))}%`,
                  }}
                />
              </div>

              <span className="busyness-hour-label">
                {showTimeLabel ? formatHour(hour.hour_of_day) : ""}
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

export default BusynessChart;