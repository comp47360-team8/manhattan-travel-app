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
];

type CategoryTabsProps = {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
};

function CategoryTabs({
  selectedCategory,
  onCategoryChange,
}: CategoryTabsProps) {
  return (
    <section className="category-section" aria-label="Attraction categories">
      <div className="category-tabs" role="list">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={
              selectedCategory === category.id
                ? "category-tab active"
                : "category-tab"
            }
            onClick={() => onCategoryChange(category.id)}
            aria-pressed={selectedCategory === category.id}
          >
            {category.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export default CategoryTabs;
