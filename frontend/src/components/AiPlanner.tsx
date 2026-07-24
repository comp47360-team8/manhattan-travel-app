import { useEffect, useMemo, useRef, useState } from "react";

import { apiFetch } from "../api";
import { groupStopsByDay } from "../itinerary";
import type {
  AiChatResponse,
  AiConversationResponse,
  AiUiAction,
  ItineraryResponse,
  Poi,
  SavedItinerary,
} from "../types";
import BusynessChart from "./BusynessChart";

const PROMPT_SUGGESTIONS = [
  "Plan a low-crowd day with museums and architecture.",
  "Plan an accessible weekend with parks and viewpoints.",
  "Plan a relaxed local day with markets and neighbourhood walks.",
];

const OPENING_MESSAGE =
  "Hi! I'm your trip planner. Tell me about your preferred dates, travel pace, interests, or anything you'd like to avoid.";

type PlannerMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
};

type AIPlannerProps = {
  pois: Poi[];
  isAuthenticated: boolean;
  onLoginRequired: () => void;
  onItineraryGenerated: (itinerary: ItineraryResponse) => void;
};

function formatDate(value: string): string {
  const date = new Date(`${value}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatTime(value: string): string {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hour, minute));
}

function isAuthenticationError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.toLowerCase().includes("log in")
  );
}

function AIPlanner({
  pois,
  isAuthenticated,
  onLoginRequired,
  onItineraryGenerated,
}: AIPlannerProps) {
  const [prompt, setPrompt] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PlannerMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: OPENING_MESSAGE,
    },
  ]);
  const [uiAction, setUiAction] = useState<AiUiAction | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const itineraryResultRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const itineraryDays = useMemo(
    () => (itinerary ? groupStopsByDay(itinerary.stops) : []),
    [itinerary]
  );
  const hasUserSentMessage = messages.some(
    (message) => message.role === "user"
  );

  /*
    Once the backend returns an itinerary, I move the viewport and keyboard
    focus to the result so it is not hidden below the conversation.
  */
  useEffect(() => {
    if (!itinerary) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const result = itineraryResultRef.current;

      result?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
      result?.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [itinerary]);

  /*
    Keeps the prompt box a single compact line until the user actually
    types something longer, instead of always showing a tall empty box.
  */
  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 140)}px`;
  }, [prompt]);

  function requireLogin(): boolean {
    if (isAuthenticated) {
      return false;
    }

    setErrorMessage("Please log in to use the AI Planner.");
    onLoginRequired();
    return true;
  }

  async function getConversationId(): Promise<string> {
    if (conversationId) {
      return conversationId;
    }

    const created = await apiFetch<AiConversationResponse>(
      "/api/ai/conversations",
      { method: "POST" }
    );

    setConversationId(created.conversation_id);
    return created.conversation_id;
  }

  async function sendPlannerMessage(
    value: string | string[],
    displayText: string
  ) {
    if (requireLogin()) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSending(true);
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text: displayText },
    ]);

    try {
      const activeConversationId = await getConversationId();

      /*
        The backend route currently contains the spelling "converstions".
        I use that exact source route until the backend renames it.
      */
      const response = await apiFetch<AiChatResponse>(
        `/api/ai/converstions/${activeConversationId}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ prompt: value }),
          // Gemini may need longer than a standard API request to reply.
          signal: AbortSignal.timeout(90_000),
        }
      );

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: response.message,
        },
      ]);
      setUiAction(response.ui_action);
      setSelectedOptions([]);

      if (response.itinerary) {
        setItinerary(response.itinerary);
        setSuccessMessage(
          "Your itinerary is ready. Review it here, then open it in My Itinerary."
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The AI Planner could not complete that request.";

      if (message === "Please log in to continue.") {
        onLoginRequired();
      }

      setErrorMessage(
        message.includes("server could not complete")
          ? "The AI service is temporarily unavailable. Check that the backend Gemini API key is configured, then try again."
          : message
      );
    } finally {
      setIsSending(false);
    }
  }

  async function submitPlannerRequest() {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      setErrorMessage(
        "Describe the kind of Manhattan trip you would like to plan."
      );
      return;
    }

    setPrompt("");
    await sendPlannerMessage(trimmedPrompt, trimmedPrompt);
  }

  function toggleOption(value: string) {
    setSelectedOptions((current) =>
      current.includes(value)
        ? current.filter((option) => option !== value)
        : [...current, value]
    );
  }

  async function submitOptions() {
    if (selectedOptions.length === 0) {
      setErrorMessage("Select at least one option before continuing.");
      return;
    }

    const labels =
      uiAction?.options
        .filter((option) => selectedOptions.includes(option.value))
        .map((option) => option.label) ?? selectedOptions;

    await sendPlannerMessage(selectedOptions, labels.join(", "));
  }

  function startNewConversation() {
    setConversationId(null);
    setPrompt("");
    setMessages([
      {
        id: Date.now(),
        role: "assistant",
        text: OPENING_MESSAGE,
      },
    ]);
    setUiAction(null);
    setSelectedOptions([]);
    setItinerary(null);
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function saveItinerary() {
    if (!itinerary || requireLogin()) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      const saved = await apiFetch<SavedItinerary>("/api/itinerary", {
        method: "POST",
        body: JSON.stringify(itinerary),
      });

      setSuccessMessage(`Itinerary "${saved.trip_name}" was saved.`);
    } catch (error) {
      if (isAuthenticationError(error)) {
        setErrorMessage("Please log in to save this itinerary.");
        onLoginRequired();
        return;
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The itinerary could not be saved."
      );
    } finally {
      setIsSaving(false);
    }
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
      </section>

      <section className="ai-planner-card ai-chat-card">
        <div className="ai-planner-card-heading">
          <div>
            <p className="section-eyebrow">Chat with Offpeak</p>
          </div>

          {conversationId && (
            <button
              type="button"
              className="ai-new-conversation"
              onClick={startNewConversation}
              disabled={isSending}
            >
              Start again
            </button>
          )}
        </div>

        <div className="ai-chat-history" aria-live="polite">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`ai-chat-message ${message.role}`}
            >
              <strong>{message.role === "assistant" ? "Offpeak" : "You"}</strong>
              <p>{message.text}</p>
            </article>
          ))}

          {isSending && (
            <article className="ai-chat-message assistant">
              <strong>Offpeak</strong>
              <p>Planning your next step...</p>
            </article>
          )}
        </div>

        {uiAction?.component === "poi_type_selector" && (
          <fieldset className="ai-option-selector">
            <legend>Select all that interest you</legend>

            <div>
              {uiAction.options.map((option) => (
                <label key={option.value}>
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option.value)}
                    onChange={() => toggleOption(option.value)}
                    disabled={isSending}
                  />
                  <span>{option.label}</span>
                </label>
              ))}

              <button
                type="button"
                className="ai-option-selector-continue"
                onClick={() => void submitOptions()}
                disabled={isSending || selectedOptions.length === 0}
              >
                Continue
              </button>
            </div>
          </fieldset>
        )}

        {!hasUserSentMessage && (
          <div className="ai-planner-suggestions" aria-label="Prompt suggestions">
            {PROMPT_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  setPrompt(suggestion);
                  setErrorMessage("");
                }}
                disabled={isSending}
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        {errorMessage && (
          <p className="error-message" role="alert">
            {errorMessage}
          </p>
        )}

        {successMessage && (
          <p className="success-message" role="status">
            {successMessage}
          </p>
        )}

        <label htmlFor="ai-planner-prompt" className="sr-only">
          Reply to the AI trip planner
        </label>

        <div className="ai-composer">
          <textarea
            id="ai-planner-prompt"
            ref={textareaRef}
            rows={1}
            maxLength={600}
            placeholder="Tell Offpeak your dates, pace, interests or anything you want to avoid."
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              setErrorMessage("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void submitPlannerRequest();
              }
            }}
            disabled={isSending}
          />

          <button
            type="button"
            className="ai-composer-send"
            onClick={() => void submitPlannerRequest()}
            disabled={isSending}
            aria-label={isSending ? "Sending" : "Send to AI Planner"}
          >
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        </div>

        <span className="ai-character-count">{prompt.length}/600</span>
      </section>

      {itinerary && (
        <section
          ref={itineraryResultRef}
          className="ai-itinerary-result"
          tabIndex={-1}
        >
          <header>
            <div>
              <p className="section-eyebrow">Generated itinerary</p>
              <h2>{itinerary.trip_name}</h2>
              <p>
                {itinerary.start_date} to {itinerary.end_date}
              </p>
            </div>

            <div className="ai-itinerary-actions">
              <button
                type="button"
                onClick={() => onItineraryGenerated(itinerary)}
                disabled={itinerary.stops.length === 0}
              >
                Open in My Itinerary
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => void saveItinerary()}
                disabled={isSaving || itinerary.stops.length === 0}
              >
                {isSaving ? "Saving..." : "Save itinerary"}
              </button>
            </div>
          </header>

          {itinerary.warning?.trim() && (
            <p className="fallback-message">
              <strong>Scheduling note:</strong> {itinerary.warning}
            </p>
          )}

          {itinerary.stops.length === 0 ? (
            <p className="fallback-message">
              The AI completed the request but did not return any scheduled
              stops. Add more trip details and ask it to try again.
            </p>
          ) : (
            <div className="ai-itinerary-days">
              {itineraryDays.map((day) => (
                <section key={`${day.dayNumber}-${day.visitDate}`}>
                  <h3>
                    Day {day.dayNumber} · {formatDate(day.visitDate)}
                  </h3>

                  {day.stops.map((stop) => {
                    const poi = pois.find((item) => item.slug === stop.slug);
                    const whyThisTime =
                      stop.why_this_time?.trim() ||
                      poi?.why_this_time?.trim();

                    return (
                      <article
                        key={`${stop.slug}-${stop.position}`}
                        className="ai-itinerary-stop"
                      >
                        <div className="ai-itinerary-stop-heading">
                          <div>
                            <span>
                              {formatTime(stop.slot_start)}–
                              {formatTime(stop.slot_end)}
                            </span>
                            <h4>{stop.poi_name}</h4>
                            <p>
                              {stop.neighborhood}, {stop.borough}
                            </p>
                          </div>
                          <strong>{stop.crowd_level} crowds</strong>
                        </div>

                        <p>
                          <strong>Why this time:</strong>{" "}
                          {whyThisTime ||
                            "A detailed recommendation explanation is not available for this stop."}
                        </p>

                        {stop.busyness_for_day?.length > 0 ? (
                          <BusynessChart
                            hours={stop.busyness_for_day}
                            poiName={stop.poi_name}
                          />
                        ) : (
                          <p className="fallback-message">
                            Hourly crowd data is not available for this stop.
                          </p>
                        )}
                      </article>
                    );
                  })}
                </section>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default AIPlanner;
