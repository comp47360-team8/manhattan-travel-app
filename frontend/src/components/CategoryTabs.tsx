type CategoryTabsProps = {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
};

const categories = [
  { label: "All", value: "all" },
  { label: "Landmarks", value: "landmark" },
  { label: "Museums", value: "museum" },
  { label: "Parks", value: "park" },
  { label: "Galleries", value: "gallery" },
  { label: "Markets", value: "market" },
  { label: "Viewpoints", value: "viewpoint" },
  { label: "Neighborhoods", value: "neighborhood" },
];

function CategoryTabs({ selectedCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="tabs">
      {categories.map((category) => (
        <button
          key={category.value}
          className={selectedCategory === category.value ? "active" : ""}
          onClick={() => onCategoryChange(category.value)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}

export default CategoryTabs;