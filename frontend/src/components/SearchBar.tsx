type SearchBarProps = {
  onSearchChange: (value: string) => void;
  variant?: "full" | "compact";
};

function SearchBar({
  onSearchChange,
  variant = "full",
}: SearchBarProps) {
  if (variant === "compact") {
    return (
      <label className="search-field itinerary-search-field">
        <span className="search-field-icon" aria-hidden="true">
          ⌕
        </span>

        <input
          className="search"
          type="search"
          placeholder="Search by name, type, borough, or neighbourhood"
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search attractions for this itinerary"
        />
      </label>
    );
  }

  return (
    <section className="explore-search-panel">
      <div className="explore-search-copy">
        <p className="section-eyebrow">Find a place</p>

        <h2>Search Manhattan attractions</h2>

        <p>
          Search by attraction name, neighbourhood, borough, or category.
        </p>
      </div>

      <label className="search-field">
        <span className="search-field-icon" aria-hidden="true">
          ⌕
        </span>

        <input
          className="search"
          type="search"
          placeholder="Search museums, parks, neighbourhoods..."
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search attractions"
        />
      </label>
    </section>
  );
}

export default SearchBar;
