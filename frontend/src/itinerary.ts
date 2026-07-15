import type { ItineraryStop } from "./types";

export type ItineraryDay<T extends ItineraryStop> = {
  dayNumber: number;
  visitDate: string;
  stops: T[];
};

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