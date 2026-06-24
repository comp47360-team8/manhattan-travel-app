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
  image_url?: string;
};

function App() {

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [currentPage, setCurrentPage] = useState("explore");
  const [pois, setPois] = useState<Poi[]>([]);

  useEffect(() => {
  

  fetch("http://127.0.0.1:8000/api/pois")
    .then((response) => {
      
      return response.json();
    })
    .then((data) => {
      
      console.log("POIs from backend:", data);
      setPois(data.results || []);
    })
    .catch((error) => {
      console.error("Failed to fetch POIs:", error);
      
    });
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
        {currentPage === "explore" && (
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
                  crowdLevel={50}
                  bestTime="Backend POI loaded"
                  category={poi.type}
                />
              ))}
            </section>
          </>
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