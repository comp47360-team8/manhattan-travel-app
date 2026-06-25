type AttractionCardProps = {
  image: string;
  name: string;
  crowdLevel: number;
  bestTime: string;
  neighborhood: string;
  rating: number | null;
  reviewCount: number | null;
  isAccessible: boolean;
  onClick?: () => void;
};

function formatReviewCount(reviewCount: number | null) {
  if (reviewCount === null) {
    return "No reviews yet";
  }

  if (reviewCount >= 1000) {
    return `${Math.round(reviewCount / 1000)}k reviews`;
  }

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
  onClick,
}: AttractionCardProps) {
  return (
    <article className="attraction-card" onClick={onClick}>
      <button
        className="save-button"
        onClick={(event) => {
          event.stopPropagation();
          alert(`${name} saved`);
        }}
      >
        ♡ Save
      </button>

      <img src={image} alt={name} />

      <h3>{name}</h3>

      <div className="card-planning-info">
        <p className="crowd-pulse">Crowd Level: {crowdLevel}%</p>
        <p className="best-time">🕘 {bestTime}</p>
      </div>

      <div className="card-meta-info">
        <p>📍 {neighborhood}</p>
        <p>
          ⭐ {rating ?? "N/A"} ({formatReviewCount(reviewCount)})
        </p>
        {isAccessible && <p className="accessibility-badge">♿ Accessible</p>}
      </div>
    </article>
  );
}

export default AttractionCard;