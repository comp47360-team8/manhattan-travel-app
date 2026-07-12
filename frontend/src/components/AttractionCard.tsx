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
  isSaving?: boolean;
  onSaveClick: () => void;
  onClick?: () => void;
};

function formatReviewCount(reviewCount: number | null): string {
  if (reviewCount === null) return "Reviews pending";

  if (reviewCount >= 1000) {
    const shortenedCount = reviewCount / 1000;
    return `${shortenedCount.toFixed(shortenedCount >= 10 ? 0 : 1)}k reviews`;
  }

  return `${reviewCount.toLocaleString()} ${reviewCount === 1 ? "review" : "reviews"}`;
}

function getCrowdClass(crowdLevel: string): string {
  const level = crowdLevel.toLowerCase();

  if (level.includes("quiet") || level.includes("low")) return "quiet";
  if (level.includes("busy") || level.includes("high")) return "busy";
  if (level.includes("moderate") || level.includes("medium")) return "moderate";
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
  isSaving = false,
  onSaveClick,
  onClick,
}: AttractionCardProps) {
  return (
    <article className="attraction-card">
      <button
        type="button"
        className="attraction-card-main"
        onClick={onClick}
        aria-label={`View details for ${name}`}
      >
        <div className="attraction-card-image-wrapper">
          <img
            src={image}
            alt=""
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = "https://placehold.co/600x380?text=Manhattan";
            }}
          />

          <span className={`crowd-badge ${getCrowdClass(crowdLevel)}`}>
            <span className="crowd-badge-dot" aria-hidden="true" />
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
              {rating !== null ? rating.toFixed(1) : "Pending"}
            </span>
            <span className="card-review-count">{formatReviewCount(reviewCount)}</span>
          </div>

          <div className="card-planning-info">
            <div>
              <span className="card-info-label">Best time</span>
              <strong className="best-time">{bestTime}</strong>
            </div>

            {isAccessible && (
              <span className="accessibility-badge">
                <span aria-hidden="true">♿</span>
                Accessible
              </span>
            )}
          </div>

          <span className="card-open-link">
            View details
            <span aria-hidden="true">→</span>
          </span>
        </div>
      </button>

      <button
        type="button"
        className={`save-button ${isSaved ? "saved" : ""}`}
        onClick={onSaveClick}
        aria-label={isSaved ? `Remove ${name} from saved places` : `Save ${name}`}
        aria-pressed={isSaved}
        disabled={isSaving}
      >
        <span aria-hidden="true">{isSaving ? "…" : isSaved ? "♥" : "♡"}</span>
      </button>
    </article>
  );
}

export default AttractionCard;
