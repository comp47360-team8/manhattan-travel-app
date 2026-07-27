import type { Poi } from "./types";

/*
  Accessibility labels come from the OpenStreetMap `wheelchair` tag and reach
  us in mixed forms: `wheelchair`, `wheelchair_limited`, `step_free`,
  `step-free`. Itinerary stops type the same data as `unknown[]`, so every
  value is coerced before comparison.
*/
function normaliseLabels(labels: readonly unknown[] | null | undefined): string[] {
  return (labels ?? []).map((label) =>
    String(label).toLowerCase().replaceAll("-", "_").replaceAll(" ", "_")
  );
}

/*
  `wheelchair_limited` is deliberately NOT accepted. From a visitor's point of
  view partial access is the same as no access, so only a confirmed wheelchair
  or step-free label counts as accessible.

  An empty list means the OSM data is missing, which is not the same as the
  place having no accessible features. The UI never claims otherwise -- it
  points people at the venue's own site instead.
*/
function isConfirmedLabel(normalisedLabel: string): boolean {
  return (
    normalisedLabel === "wheelchair" ||
    normalisedLabel === "wheelchair_yes" ||
    normalisedLabel.includes("step_free")
  );
}

/* The single definition of "accessible" shared by every filter and badge. */
export function isWheelchairAccessible(poi: Poi): boolean {
  return normaliseLabels(poi.accessibility_labels).some(isConfirmedLabel);
}

/*
  Same rule, but returning the surviving labels so panels and chips can list
  them. Anything unconfirmed is dropped rather than displayed, which keeps
  "wheelchair_limited" from ever being shown under an "Accessible" heading.
*/
export function confirmedAccessibilityLabels(
  labels: readonly unknown[] | null | undefined
): string[] {
  return normaliseLabels(labels).filter(isConfirmedLabel);
}

/* Turns a stored label such as `step_free` into `step free` for display. */
export function formatAccessibilityLabel(label: string): string {
  return label.replaceAll("_", " ");
}

/*
  Ready-to-render list for the itinerary timeline chips, which read "Accessible:
  ...". Returns an empty string when nothing is confirmed so the caller can drop
  the chip entirely rather than labelling a place accessible that is not.
*/
export function accessibilitySummary(
  labels: readonly unknown[] | null | undefined
): string {
  return confirmedAccessibilityLabels(labels)
    .map(formatAccessibilityLabel)
    .join(", ");
}
