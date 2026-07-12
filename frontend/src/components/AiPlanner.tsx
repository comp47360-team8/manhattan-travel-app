import { useState } from "react";

/*
  The backend AI Planner endpoint has not been added yet.

  This component provides the complete frontend structure now, while keeping
  the future API connection in one small function.
*/
function AIPlanner() {
  const [prompt, setPrompt] = useState("");
  const [plannerMessage, setPlannerMessage] = useState("");

  /*
    Future backend integration point.

    When Hansel adds the Gemini endpoint, this function can be replaced with:

    const result = await apiFetch<AIPlannerResponse>(
      "/api/ai-planner",
      {
        method: "POST",
        body: JSON.stringify({ prompt }),
      }
    );

    Until that endpoint exists, this page does not pretend to generate AI data.
  */
  function submitPlannerRequest() {
    setPlannerMessage("");

    if (prompt.trim() === "") {
      setPlannerMessage(
        "Describe the kind of Manhattan trip you would like to plan."
      );
      return;
    }

    setPlannerMessage(
      "The AI Planner interface is ready. Backend Gemini integration is still pending."
    );
  }

  return (
    <section className="ai-planner-page">
      <div className="ai-planner-hero">
        <p className="section-eyebrow">AI Planner</p>

        <h1>Describe your ideal Manhattan trip</h1>

        <p>
          Tell us what you enjoy, how long you have, and any accessibility
          requirements. The AI Planner will turn your request into a suggested
          itinerary once the Gemini backend endpoint is available.
        </p>
      </div>

      <section className="ai-planner-card">
        <label htmlFor="ai-planner-prompt">
          What would you like to do?
        </label>

        <textarea
          id="ai-planner-prompt"
          rows={8}
          placeholder="Example: Plan a quiet two-day Manhattan trip focused on museums, parks, accessible attractions, and affordable food."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
        />

        <div className="ai-planner-suggestions">
          <button
            type="button"
            onClick={() =>
              setPrompt(
                "Plan a one-day Manhattan trip with museums, architecture, and low crowd levels."
              )
            }
          >
            Museums and architecture
          </button>

          <button
            type="button"
            onClick={() =>
              setPrompt(
                "Plan an accessible Manhattan weekend with parks, viewpoints, and wheelchair-friendly attractions."
              )
            }
          >
            Accessible weekend
          </button>

          <button
            type="button"
            onClick={() =>
              setPrompt(
                "Plan a relaxed Manhattan day with neighbourhood walks, food markets, and quieter visiting times."
              )
            }
          >
            Relaxed local day
          </button>
        </div>

        <button
          type="button"
          className="ai-planner-submit"
          onClick={submitPlannerRequest}
        >
          Generate with AI
        </button>

        {plannerMessage && (
          <p className="fallback-message">{plannerMessage}</p>
        )}
      </section>

      <section className="ai-planner-status">
        <h2>Integration status</h2>

        <p>
          The web interface is complete and ready to connect. The remaining
          dependency is the backend Gemini endpoint and its request/response
          schema.
        </p>
      </section>
    </section>
  );
}

export default AIPlanner;