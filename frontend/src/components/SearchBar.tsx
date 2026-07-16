type SearchBarProps = {
  value?: string;
  onSearchChange: (value: string) => void;
  variant?: "full" | "compact";
};

function SearchBar({
  value = "",
  onSearchChange,
  variant = "full",
}: SearchBarProps) {
  if (variant === "compact") {
    return (
      <div className="search-field itinerary-search-field">
        <span className="search-field-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <circle cx="11" cy="11" r="6" />
            <path d="m16 16 4 4" />
          </svg>
        </span>

        <input
          className="search"
          type="search"
          value={value}
          placeholder="Search by name, type, borough, or neighbourhood"
          onChange={(event) => onSearchChange(event.target.value)}
          aria-label="Search attractions for this itinerary"
        />

        {value.trim() && (
          <button
            type="button"
            className="search-clear-button"
            onClick={() => onSearchChange("")}
            aria-label="Clear attraction search"
          >
            {"\u00d7"}
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="explore-search-panel" aria-labelledby="explore-search-title">
      <div className="explore-search-copy">
        <p className="section-eyebrow">Find a place</p>
        <h2 id="explore-search-title">Search Manhattan attractions</h2>
        <p>Search by attraction name, neighbourhood, borough, or category.</p>
      </div>

      <div className="explore-search-control">
        <div className="search-field">
          <span className="search-field-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <circle cx="11" cy="11" r="6" />
              <path d="m16 16 4 4" />
            </svg>
          </span>
          <input
            className="search"
            type="search"
            value={value}
            placeholder="Search museums, parks, neighbourhoods..."
            onChange={(event) => onSearchChange(event.target.value)}
            aria-label="Search attractions"
          />

          {value.trim() && (
            <button
              type="button"
              className="search-clear-button"
              onClick={() => onSearchChange("")}
              aria-label="Clear attraction search"
            >
              {"\u00d7"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export default SearchBar;
