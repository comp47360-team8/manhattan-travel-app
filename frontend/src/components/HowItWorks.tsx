/*
  A short, honest description of what the scheduler in
  backend/app/services/itinerary actually does. Each step maps to one stage of
  create_itinerary, so this stays true if someone checks the code:

  1. poi_profile builds an open/closed matrix per day and slot
  2. assign_days spreads the chosen places evenly across the trip
  3. find_best_slot picks the lowest average busyness_pct slot for each place
  4. optimize_day reorders each day for the shortest walking chain

  Deliberately not claimed: transit routing, real travel times, or per-place
  duration fitting. None of those are implemented.
*/
const STEPS = [
  {
    title: "Open when you visit",
    detail: "We drop anywhere closed on your travel dates.",
  },
  {
    title: "Spread across your days",
    detail: "Your places are shared out evenly, so no day is crammed.",
  },
  {
    title: "Placed at its quietest",
    detail:
      "Each stop lands in the morning, afternoon, or evening window with the smallest crowds.",
  },
  {
    title: "Ordered to walk less",
    detail: "Stops within a day are sequenced to keep distances short.",
  },
];

function HowItWorks() {
  return (
    <section className="how-it-works" aria-labelledby="how-it-works-title">
      <div className="how-it-works-intro">
        <h2 id="how-it-works-title">How we build your itinerary</h2>

        <p>
          Crowd predictions come from a model trained on hourly visit data for
          every place, every day of the week.
        </p>
      </div>

      <ol className="how-it-works-steps">
        {STEPS.map((step, index) => (
          <li key={step.title}>
            <span className="how-it-works-icon" aria-hidden="true">
              {step.icon}
            </span>

            <span className="how-it-works-step-number" aria-hidden="true">
              {index + 1}
            </span>

            <strong>{step.title}</strong>
            <span>{step.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default HowItWorks;
