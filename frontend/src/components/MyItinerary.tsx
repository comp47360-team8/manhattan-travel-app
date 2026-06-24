function MyItinerary() {
  return (
    <section className="my-itinerary">
      <h2>My Itinerary</h2>
      <p>Plan your Manhattan trip around quieter times.</p>

      <label>Select Date</label>
      <input type="date" />

      <div className="itinerary-empty">
        <p>No places selected yet.</p>
        <p>Saved places can be added to your itinerary later.</p>
      </div>
    </section>
  );
}

export default MyItinerary;