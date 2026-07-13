import { useState } from "react";

const PROMPT_SUGGESTIONS = [
  "Plan a low-crowd day with museums and architecture.",
  "Plan an accessible weekend with parks and viewpoints.",
  "Plan a relaxed local day with markets and neighbourhood walks.",
];

/*
  The AI backend is not available yet, so I keep this page honest and show a
  complete frontend state without pretending that a plan was generated.
*/
function AIPlanner() {
  const [prompt, setPrompt] = useState("");
  const [message, setMessage] = useState("");

  function submitPlannerRequest() {
    if (prompt.trim() === "") {
      setMessage("Describe the kind of Manhattan trip you would like to plan.");
      return;
    }

    setMessage(
      "AI itinerary generation is currently in development. Your request has not been sent because the Gemini backend endpoint is not available yet."
    );
  }

  return (
    <main className="ai-planner-page">
      <section className="ai-planner-hero">
        <div>
          <p className="section-eyebrow">AI Planner</p>
          <h1>Plan around what matters to you</h1>
          <p>
            Describe your ideal Manhattan trip, including interests, pace,
            dates and accessibility needs.
          </p>
        </div>

        <div className="ai-planner-badge" role="status">
          <span aria-hidden="true" />
          Backend integration in development
        </div>
      </section>

      <section className="ai-planner-card">
        <div className="ai-planner-card-heading">
          <div>
            <p className="section-eyebrow">Trip request</p>
            <h2>What would you like to experience?</h2>
          </div>
          <span>{prompt.length}/600</span>
        </div>

        <label htmlFor="ai-planner-prompt" className="sr-only">
          Describe your ideal Manhattan trip
        </label>

        <textarea
          id="ai-planner-prompt"
          rows={8}
          maxLength={600}
          placeholder="Example: Plan a quiet two-day trip focused on museums, parks, accessible attractions and affordable food."
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setMessage("");
          }}
        />

        <div className="ai-planner-suggestions" aria-label="Prompt suggestions">
          {PROMPT_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setPrompt(suggestion);
                setMessage("");
              }}
            >
              {suggestion}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="ai-planner-submit"
          onClick={submitPlannerRequest}
        >
          Generate with AI
        </button>

        {message && <p className="ai-planner-message">{message}</p>}
      </section>

      <section className="ai-planner-status">
        <div className="ai-planner-status-icon" aria-hidden="true">✦</div>
        <div>
          <h2>What is ready</h2>
          <p>
            The complete web interface, prompt validation and responsive design
            are ready. The remaining dependency is the backend Gemini endpoint
            and its confirmed request and response schema.
          </p>
        </div>
      </section>
    </main>
  );
}

export default AIPlanner;
