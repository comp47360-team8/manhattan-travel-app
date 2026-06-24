function MyItinerary() {
  return (
    <section className="my-itinerary">
      <h1>My Itinerary</h1>

      <label htmlFor="itinerary-date">Select trip date:</label>
      <input id="itinerary-date" type="date" />

      <div className="empty-itinerary">
        <h2>No activities planned yet</h2>
        <p>Saved POIs will appear here when added to your itinerary.</p>
      </div>
    </section>
  );
}

export default MyItinerary;