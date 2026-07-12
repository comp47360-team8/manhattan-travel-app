type AttractionCardProps = {
  image: string;
  name: string;
  crowdLevel: string;
  bestTime: string;
  neighborhood: string;
  rating: number | null;
  reviewCount: number | null;
  isAccessible: boolean;
  isSaved: boolean;
  onSaveClick: () => void;
  onClick?: () => void;
};

/*
  Formats large Google review counts into a shorter readable value.

  Examples:
  842 becomes "842 reviews"
  1250 becomes "1.3k reviews"
*/
function formatReviewCount(reviewCount: number | null): string {
  if (reviewCount === null) {
    return "Reviews pending";
  }

  if (reviewCount >= 1000) {
    const shortenedCount = reviewCount / 1000;

    return `${shortenedCount.toFixed(
      shortenedCount >= 10 ? 0 : 1
    )}k reviews`;
  }

  return `${reviewCount.toLocaleString()} ${
    reviewCount === 1 ? "review" : "reviews"
  }`;
}

/*
  Converts the backend crowd wording into a CSS class.

  Unknown or pending values receive a neutral style rather than appearing
  as incorrect crowd information.
*/
function getCrowdClass(crowdLevel: string): string {
  const normalisedLevel = crowdLevel.toLowerCase();

  if (
    normalisedLevel.includes("quiet") ||
    normalisedLevel.includes("low")
  ) {
    return "quiet";
  }

  if (
    normalisedLevel.includes("busy") ||
    normalisedLevel.includes("high")
  ) {
    return "busy";
  }

  if (
    normalisedLevel.includes("moderate") ||
    normalisedLevel.includes("medium")
  ) {
    return "moderate";
  }

  return "pending";
}

function AttractionCard({
  image,
  name,
  crowdLevel,
  bestTime,
  neighborhood,
  rating,
  reviewCount,
  isAccessible,
  isSaved,
  onSaveClick,
  onClick,
}: AttractionCardProps) {
  const crowdClass = getCrowdClass(crowdLevel);

  function openAttraction() {
    onClick?.();
  }

  function handleKeyboardOpen(
    event: React.KeyboardEvent<HTMLElement>
  ) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAttraction();
    }
  }

  return (
    <article
      className="attraction-card"
      onClick={openAttraction}
      onKeyDown={handleKeyboardOpen}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={
        onClick
          ? `View details for ${name}`
          : undefined
      }
    >
      <div className="attraction-card-image-wrapper">
        <img
          src={image}
          alt=""
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src =
              "https://placehold.co/600x380?text=Manhattan";
          }}
        />

        <button
          type="button"
          className={`save-button ${
            isSaved ? "saved" : ""
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onSaveClick();
          }}
          aria-label={
            isSaved
              ? `Remove ${name} from saved places`
              : `Save ${name}`
          }
          aria-pressed={isSaved}
        >
          <span aria-hidden="true">
            {isSaved ? "♥" : "♡"}
          </span>
        </button>

        <span
          className={`crowd-badge ${crowdClass}`}
        >
          <span
            className="crowd-badge-dot"
            aria-hidden="true"
          />

          {crowdLevel}
        </span>
      </div>

      <div className="card-body">
        <p className="card-location">
          <span aria-hidden="true">⌖</span>
          {neighborhood}
        </p>

        <h3>{name}</h3>

        <div className="card-rating-row">
          <span className="card-rating">
            <span aria-hidden="true">★</span>

            {rating !== null
              ? rating.toFixed(1)
              : "Pending"}
          </span>

          <span className="card-review-count">
            {formatReviewCount(reviewCount)}
          </span>
        </div>

        <div className="card-planning-info">
          <div>
            <span className="card-info-label">
              Best time
            </span>

            <strong className="best-time">
              {bestTime}
            </strong>
          </div>

          {isAccessible && (
            <span className="accessibility-badge">
              <span aria-hidden="true">♿</span>
              Accessible
            </span>
          )}
        </div>

        <div className="card-open-link">
          View details
          <span aria-hidden="true">→</span>
        </div>
      </div>
    </article>
  );
}

export default AttractionCard;