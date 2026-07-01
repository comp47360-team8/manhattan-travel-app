type TopNavProps = {
  currentPage: string;
  onPageChange: (page: string) => void;
};

function TopNav({ currentPage, onPageChange }: TopNavProps) {
  return (
    <nav className="top-nav">
      <button className="top-nav-brand" onClick={() => onPageChange("explore")}>
        Offpeak
      </button>

      <div className="top-nav-links">
        <button className={currentPage === "explore" ? "active" : ""} onClick={() => onPageChange("explore")}>Explore</button>
        <button className={currentPage === "ai" ? "active" : ""} onClick={() => onPageChange("ai")}>AI Planner</button>
        <button className={currentPage === "itinerary" ? "active" : ""} onClick={() => onPageChange("itinerary")}>My Itinerary</button>
        <button className={currentPage === "saved" ? "active" : ""} onClick={() => onPageChange("saved")}>Saved</button>
      </div>

      <button className="top-nav-profile" aria-label="Profile">👤</button>
    </nav>
  );
}

export default TopNav;