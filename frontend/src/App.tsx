import "./App.css";
import AttractionCard from "./components/AttractionCard";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CategoryTabs from "./components/CategoryTabs";
import Authform from "./components/AuthForm";
import TopNav from "./components/TopNav";
import MyItinerary from "./components/MyItinerary";
import { useEffect, useState } from "react";

type Poi = {
  slug: string;
  name: string;
  type: string;
  address: string;
  summary: string;
  description: string;
  image_url?: string;
};

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [currentPage, setCurrentPage] = useState("explore");
  const [pois, setPois] = useState<Poi[]>([]);
  const [selectedPoi, setSelectedPoi] = useState<Poi | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/pois")
      .then((response) => response.json())
      .then((data) => setPois(data))
      .catch((error) => console.error("Failed to fetch POIs:", error));
  }, []);

  function openLogin() {
    setAuthMode("login");
    setIsLoginOpen(true);
  }

  function closeLogin() {
    setIsLoginOpen(false);
  }

  function openRegister() {
    setAuthMode("register");
    setIsLoginOpen(true);
  }

  function switchToLogin() {
    setAuthMode("login");
  }

  return (
    <main className="app">
      <TopNav onPageChange={setCurrentPage} />

      <section className="page-container">
        {currentPage === "explore" && selectedPoi === null && (
          <>
            <Header onLoginClick={openLogin} onRegisterClick={openRegister} />
            <SearchBar />
            <CategoryTabs />

            <section className="cards">
              {pois.map((poi) => (
                <AttractionCard
                  key={poi.slug}
                  image={poi.image_url || "https://placehold.co/300x180"}
                  name={poi.name}
                  crowdLevel={0}
                  bestTime={poi.summary}
                  category={poi.type}
                  onClick={() => setSelectedPoi(poi)}
                />
              ))}
            </section>
          </>
        )}

        {currentPage === "explore" && selectedPoi !== null && (
          <section className="poi-detail">
            <button onClick={() => setSelectedPoi(null)}>Back to Explore</button>

            <img
              src={selectedPoi.image_url || "https://placehold.co/600x300"}
              alt={selectedPoi.name}
            />

            <h1>{selectedPoi.name}</h1>
            <p>{selectedPoi.summary}</p>

            <h3>Details</h3>
            <p>{selectedPoi.description}</p>

            <p><strong>Address:</strong> {selectedPoi.address}</p>
            <p><strong>Category:</strong> {selectedPoi.type}</p>
            <p><strong>Best time:</strong> Before 11am</p>

            <button>♡ Save</button>
          </section>
        )}

        {currentPage === "itinerary" && <MyItinerary />}
        {currentPage === "saved" && <p>Saved Places page coming soon.</p>}
        {currentPage === "ai" && <p>AI Planner page coming soon.</p>}
      </section>

      {isLoginOpen && (
        <div className="modal-overlay">
          <Authform
            authMode={authMode}
            onXClick={closeLogin}
            onRegisterClick={openRegister}
            onLoginClick={switchToLogin}
          />
        </div>
      )}
    </main>
  );
}

export default App;