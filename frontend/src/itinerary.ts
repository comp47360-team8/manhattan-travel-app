import type { ItineraryStop } from "./types";

export type ItineraryDay<T extends ItineraryStop> = {
  dayNumber: number;
  visitDate: string;
  stops: T[];
};

/*
  Dates are handled as YYYY-MM-DD strings everywhere the backend is involved.
  Parsing at local midnight keeps a date from sliding a day when the browser is
  behind UTC, which new Date(isoString) would do.
*/
export function parseIsoDate(value: string): Date | null {
  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? null : date;
}

/*
  The range ends are inclusive, so a Fri–Fri selection is a single day.
*/
export function countInclusiveDays(from: Date, to: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const difference = to.getTime() - from.getTime();

  return Math.round(difference / millisecondsPerDay) + 1;
}

export function formatItineraryDate(dateValue: string): string {
  const date = parseIsoDate(dateValue);

  if (!date) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatClockTime(timeValue: string): string {
  const [hoursValue, minutesValue = "00"] = timeValue.split(":");
  const hours = Number(hoursValue);

  if (Number.isNaN(hours)) {
    return timeValue;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutesValue} ${period}`;
}

export function crowdLevelClass(crowdLevel: string): string {
  const level = crowdLevel.trim().toLowerCase();

  if (level.includes("quiet") || level.includes("low")) {
    return "quiet";
  }

  if (level.includes("busy") || level.includes("high")) {
    return "busy";
  }

  return "moderate";
}

/*
  There is deliberately no client-side overlap check here. Slot windows are
  fixed (morning 09:00-12:00, afternoon 12:00-18:00, evening 18:00-22:00), so
  any two places sharing a slot report identical start and end times -- and two
  per slot is the scheduler's designed maximum, not a fault. Comparing those
  times flagged a conflict on perfectly normal days. The backend already sends a
  `warning` when a slot genuinely overflows, and that is what the UI shows.
*/

/*
  The backend returns broad morning, afternoon, or evening windows. I group
  stops by day and preserve their position so those windows are not presented
  as separate exact appointments happening at the same time.
*/
export function groupStopsByDay<T extends ItineraryStop>(
  stops: T[]
): ItineraryDay<T>[] {
  const days = new Map<number, ItineraryDay<T>>();

  stops.forEach((stop) => {
    const existingDay = days.get(stop.day_number);

    if (existingDay) {
      existingDay.stops.push(stop);
      return;
    }

    days.set(stop.day_number, {
      dayNumber: stop.day_number,
      visitDate: stop.visit_date,
      stops: [stop],
    });
  });

  return Array.from(days.values())
    .sort((firstDay, secondDay) => firstDay.dayNumber - secondDay.dayNumber)
    .map((day) => ({
      ...day,
      stops: [...day.stops].sort(
        (firstStop, secondStop) => firstStop.position - secondStop.position
      ),
    }));
}