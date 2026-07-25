import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "@daypicker/react";
import type { DateRange } from "@daypicker/react";

type TripDateRangeFieldProps = {
  startDate: string;
  endDate: string;
  onChange: (startDate: string, endDate: string) => void;
};

/*
  Dates are kept as YYYY-MM-DD strings so the backend contract
  (trip_dates: [start, end]) never sees a Date object. All conversion happens
  here at the boundary.
*/
function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
  Parse at local midnight, matching the convention used elsewhere in the app
  (see formatItineraryDate in MyItinerary). Using new Date(isoString) directly
  would parse as UTC and can shift the day.
*/
function fromIsoDate(value: string): Date | undefined {
  if (value === "") {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function startOfToday(): Date {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatTriggerDate(date: Date): string {
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/*
  The range ends are inclusive, so a Fri–Fri selection is a single day.
*/
function countInclusiveDays(from: Date, to: Date): number {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const difference = to.getTime() - from.getTime();

  return Math.round(difference / millisecondsPerDay) + 1;
}

function TripDateRangeField({
  startDate,
  endDate,
  onChange,
}: TripDateRangeFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const [showTwoMonths, setShowTwoMonths] = useState(true);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const today = startOfToday();

  const selectedRange: DateRange | undefined = fromIsoDate(startDate)
    ? { from: fromIsoDate(startDate), to: fromIsoDate(endDate) }
    : undefined;

  /*
    A wide popover with two months does not fit on narrow screens, so we drop
    to a single month there.
  */
  useEffect(() => {
    const query = window.matchMedia("(max-width: 780px)");

    function syncMonths() {
      setShowTwoMonths(!query.matches);
    }

    syncMonths();
    query.addEventListener("change", syncMonths);

    return () => query.removeEventListener("change", syncMonths);
  }, []);

  /*
    The popover is portalled to the body, so its position is measured from the
    trigger and kept in sync while it is open.
  */
  useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }

    function reposition() {
      const trigger = triggerRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const popover = popoverRef.current;
      const popoverHeight = popover?.offsetHeight ?? 360;
      const popoverWidth = popover?.offsetWidth ?? rect.width;
      const gap = 8;
      const margin = 16;

      let top = rect.bottom + gap;

      /*
        Flip above the trigger when the popover would overflow the viewport.
      */
      if (top + popoverHeight > window.innerHeight - margin) {
        const flippedTop = rect.top - gap - popoverHeight;

        if (flippedTop >= margin) {
          top = flippedTop;
        }
      }

      let left = rect.left;

      if (left + popoverWidth > window.innerWidth - margin) {
        left = window.innerWidth - margin - popoverWidth;
      }

      setPopoverPosition({ top: Math.max(margin, top), left: Math.max(margin, left) });
    }

    reposition();

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);

    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [isOpen, showTwoMonths]);

  /*
    Close on Escape or on a pointer press outside both the trigger and popover.
  */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;

      if (
        popoverRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) {
        return;
      }

      setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  function handleSelect(range: DateRange | undefined) {
    if (!range?.from) {
      onChange("", "");
      return;
    }

    const nextStart = toIsoDate(range.from);
    const nextEnd = range.to ? toIsoDate(range.to) : "";

    onChange(nextStart, nextEnd);

    /*
      A complete range means the user has finished picking, so the popover
      closes and the planner unlocks. This replaces the old Confirm Dates step.
    */
    if (range.to) {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  }

  const fromDate = fromIsoDate(startDate);
  const toDate = fromIsoDate(endDate);

  let triggerLabel = "Select your trip dates";

  if (fromDate && toDate) {
    triggerLabel = `${formatTriggerDate(fromDate)} – ${formatTriggerDate(
      toDate
    )} · ${countInclusiveDays(fromDate, toDate)} days`;
  } else if (fromDate) {
    triggerLabel = `${formatTriggerDate(fromDate)} – select end date`;
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="trip-date-trigger"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        data-placeholder={fromDate ? undefined : "true"}
        onClick={() => setIsOpen((open) => !open)}
      >
        {triggerLabel}
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className="trip-date-popover"
            role="dialog"
            aria-label="Choose your trip dates"
            style={{ top: popoverPosition.top, left: popoverPosition.left }}
          >
            <DayPicker
              mode="range"
              selected={selectedRange}
              onSelect={handleSelect}
              numberOfMonths={showTwoMonths ? 2 : 1}
              weekStartsOn={1}
              autoFocus
              startMonth={today}
              disabled={{ before: today }}
            />
          </div>,
          document.body
        )}
    </>
  );
}

export default TripDateRangeField;
