import "./App.css";

function App() {
  return (
    <main className="app">
      <section className="phone">
        <header className="header">
          <p className="location">📍 Manhattan, NY</p>
          <h1>OffPeak NYC</h1>
          <p>Plan quieter trips around Manhattan.</p>
        </header>

        <input className="search" placeholder="Search Manhattan spots..." />

        <div className="tabs">
          <button>Landmarks</button>
          <button>Museums</button>
          <button>Parks</button>
        </div>

        <section className="cards">
          <article className="spot-card">
            <div className="image-placeholder">Central Park</div>
            <h2>Central Park</h2>
            <p className="tag low">Low crowd</p>
            <p>Best time: 10:00 AM</p>
          </article>

          <article className="spot-card">
            <div className="image-placeholder">Brooklyn Bridge</div>
            <h2>Brooklyn Bridge</h2>
            <p className="tag medium">Moderate</p>
            <p>Best time: 8:30 AM</p>
          </article>
        </section>
      </section>
    </main>
  );
}

export default App;