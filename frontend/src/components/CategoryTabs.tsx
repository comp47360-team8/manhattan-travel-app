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
};

function CategoryTabs({
  selectedCategory,
  categoryCounts,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <section className="category-section" aria-label="Attraction categories">
      <div className="category-tabs" role="list">
        {categories.map((category) => {
          const isActive = selectedCategory === category.id;

          return (
            <button
              key={category.id}
              type="button"
              className={isActive ? "category-tab active" : "category-tab"}
              onClick={() => onCategoryChange(category.id)}
              aria-pressed={isActive}
            >
              <span>{category.label}</span>
              <span className="category-count" aria-label={`${categoryCounts[category.id] ?? 0} places`}>
                {categoryCounts[category.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default CategoryTabs;
