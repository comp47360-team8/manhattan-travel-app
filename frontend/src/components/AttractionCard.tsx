type AttractionCardProps = {
  image: string;
  name: string;
  crowdLevel: number;
  bestTime: string;
  category: string;
  onClick?: () => void;
};

function AttractionCard({
  image,
  name,
  crowdLevel,
  bestTime,
  category,
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
      <p>Crowd Level: {crowdLevel}%</p>
      <p>{bestTime}</p>
      <p>Category: {category}</p>
    </article>
  );
}

export default AttractionCard;