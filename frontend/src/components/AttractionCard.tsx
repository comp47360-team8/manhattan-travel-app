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

function formatReviewCount(reviewCount: number | null) {
  if (reviewCount === null) return "No reviews";
  if (reviewCount >= 1000) return `${Math.round(reviewCount / 1000)}k reviews`;
  return `${reviewCount} reviews`;
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
  return (
    <article className="attraction-card" onClick={onClick}>
      <button
          className={`save-button ${isSaved ? "saved" : ""}`}
          onClick={(event) => {
            event.stopPropagation();
            onSaveClick();
          }}
        >
          {isSaved ? "♥" : "♡"}
      </button>

      <img src={image} alt={name} />

      <div className="card-body">
        <p className="card-location">📍 {neighborhood}</p>
        <h3>{name}</h3>

        <div className="card-planning-info">
          <p className="crowd-pulse">{crowdLevel}</p>
          <p className="best-time">🕘 {bestTime}</p>
        </div>

        <div className="card-meta-info">
          <p>⭐ {rating ?? "N/A"} ({formatReviewCount(reviewCount)})</p>
          {isAccessible && <p className="accessibility-badge">♿ Accessible</p>}
        </div>
      </div>
    </article>
  );
}

export default AttractionCard;