import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "@daypicker/react";
import type { DateRange } from "@daypicker/react";
import { countInclusiveDays, parseIsoDate } from "../itinerary";

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
  DayPicker wants undefined rather than null for an unset end of the range.
*/
function fromIsoDate(value: string): Date | undefined {
  if (value === "") {
    return undefined;
  }

  return parseIsoDate(value) ?? undefined;
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
  /*
    DayPicker's range util (min defaults to 0) reports the very first click as a
    complete same-day range {from, to}. This ref lets us treat that first click
    as choosing the start and wait for the end, rather than closing straight
    away, while still allowing a deliberate single-day trip on a second click.
  */
  const awaitingEndDateRef = useRef(false);

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

  function closePopover() {
    awaitingEndDateRef.current = false;
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  function handleSelect(range: DateRange | undefined) {
    if (!range?.from) {
      awaitingEndDateRef.current = false;
      onChange("", "");
      return;
    }

    const fromIso = toIsoDate(range.from);
    const toIso = range.to ? toIsoDate(range.to) : "";

    /*
      A span across two different days is unambiguously complete: unlock the
      planner and close.
    */
    if (toIso && toIso !== fromIso) {
      onChange(fromIso, toIso);
      closePopover();
      return;
    }

    /*
      Otherwise the library is reporting a single day. Treat the first such
      click as choosing the start and keep the calendar open for the end date;
      a second click on the same day confirms a one-day trip.
    */
    if (!awaitingEndDateRef.current) {
      awaitingEndDateRef.current = true;
      onChange(fromIso, "");
      return;
    }

    onChange(fromIso, fromIso);
    closePopover();
  }

  const fromDate = fromIsoDate(startDate);
  const toDate = fromIsoDate(endDate);

  let triggerLabel = "Select your trip dates";

  if (fromDate && toDate) {
    const dayCount = countInclusiveDays(fromDate, toDate);
    triggerLabel = `${formatTriggerDate(fromDate)} – ${formatTriggerDate(
      toDate
    )} · ${dayCount} ${dayCount === 1 ? "day" : "days"}`;
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
        onClick={() =>
          setIsOpen((open) => {
            if (!open) {
              /* A fresh open always starts a new start-then-end selection. */
              awaitingEndDateRef.current = false;
            }
            return !open;
          })
        }
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
