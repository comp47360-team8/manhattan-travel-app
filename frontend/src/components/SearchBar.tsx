type SearchBarProps = {
  onSearchChange: (value: string) => void;
};

function SearchBar({ onSearchChange }: SearchBarProps) {
  return (
    <input
      className="search"
      placeholder="Search attractions, neighborhoods, museums..."
      onChange={(event) => onSearchChange(event.target.value)}
    />
  );
}

export default SearchBar;