import "./App.css";
import AttractionCard from "./components/AttractionCard";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CategoryTabs from "./components/CategoryTabs";
import Authform from "./components/AuthForm";
import TopNav from "./components/TopNav";
import MyItinerary from "./components/MyItinerary";
import { useState } from "react";

const attractionsArray = [
  {
    image: "https://placehold.co/300x180",
    name: "Central Park",
    crowdLevel: 50,
    bestTime: "before 11am",
    category: "Park",
  },
  {
    image: "https://placehold.co/300x180",
    name: "Empire state building",
    crowdLevel: 100,
    bestTime: "before 11am",
    category: "Landmark",
  },
  {
    image: "https://placehold.co/300x180",
    name: "Wall street",
    crowdLevel: 65,
    bestTime: "before 11am",
    category: "Landmark",
  },
  {
    image: "https://placehold.co/300x180",
    name: "China Town",
    crowdLevel: 20,
    bestTime: "before 11am",
    category: "Landmark",
  },
];

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [currentPage, setCurrentPage] = useState("explore");

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
              {attractionsArray.map((attraction) => (
                <AttractionCard
                  key={attraction.name}
                  image={attraction.image}
                  name={attraction.name}
                  crowdLevel={attraction.crowdLevel}
                  bestTime={attraction.bestTime}
                  category={attraction.category}
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