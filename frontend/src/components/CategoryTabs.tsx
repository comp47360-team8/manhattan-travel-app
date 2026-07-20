const categories = [
  { id: "all", label: "All" },
  { id: "landmark", label: "Landmarks" },
  { id: "museum", label: "Museums" },
  { id: "park", label: "Parks" },
  { id: "gallery", label: "Galleries" },
  { id: "market", label: "Markets" },
  { id: "viewpoint", label: "Viewpoints" },
  { id: "neighborhood", label: "Neighborhoods" },
  { id: "other", label: "Other" },
] as const;

type CategoryTabsProps = {
  selectedCategory: string;
  categoryCounts: Record<string, number>;
  onCategoryChange: (category: string) => void;
  accessibleOnly: boolean;
  onAccessibleOnlyChange: (isEnabled: boolean) => void;
  filtersActive: boolean;
  onClearFilters: () => void;
};

function CategoryTabs({
  selectedCategory,
  categoryCounts,
  onCategoryChange,
  accessibleOnly,
  onAccessibleOnlyChange,
  filtersActive,
  onClearFilters,
}: CategoryTabsProps) {
  function renderCategoryTab(category: (typeof categories)[number]) {
    const isActive = selectedCategory === category.id;
    const count = categoryCounts[category.id] ?? 0;

    return (
      <button
        key={category.id}
        type="button"
        className={isActive ? "category-tab active" : "category-tab"}
        onClick={() => onCategoryChange(category.id)}
        aria-pressed={isActive}
      >
        <span className="category-label">{category.label}</span>
        <span
          className="category-count"
          aria-label={`${count} ${count === 1 ? "place" : "places"}`}
        >
          {count}
        </span>
      </button>
    );
  }

  return (
    <div className="category-section">
      <div
        className="category-tabs"
        role="group"
        aria-label="Attraction filters"
      >
        {categories.map(renderCategoryTab)}
      </div>

      <div className="filter-utility-row">
        {filtersActive && (
          <button
            type="button"
            className="clear-filters-button filter-chip-clear"
            onClick={onClearFilters}
          >
            Clear filters
          </button>
        )}

        <button
          type="button"
          className={
            accessibleOnly
              ? "accessibility-filter-chip active"
              : "accessibility-filter-chip"
          }
          onClick={() => onAccessibleOnlyChange(!accessibleOnly)}
          aria-pressed={accessibleOnly}
          title="Show only attractions with wheelchair or step-free information"
        >
          Accessible places only
        </button>
      </div>
    </div>
  );
}

export default CategoryTabs;