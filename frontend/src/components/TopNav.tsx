type TopNavProps = {
  onPageChange: (page: string) => void;
};

function TopNav({ onPageChange }: TopNavProps) {
  return (
    <nav className="top-nav">
      <h2 className="top-nav-logo">Offpeak</h2>

      <div className="top-nav-links">
        <button onClick={() => onPageChange("explore")}>Explore</button>
        <button onClick={() => onPageChange("ai")}>AI Planner</button>
        <button onClick={() => onPageChange("itinerary")}>My Itinerary</button>
        <button onClick={() => onPageChange("saved")}>Saved</button>
      </div>

      <button className="top-nav-profile">👤</button>
    </nav>
  );
}

export default TopNav;