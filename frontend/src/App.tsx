import "./App.css";
import AttractionCard from "./components/AttractionCard";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";

//rudimentary data to generate cards 
const attractionsArray=[
  {
    image:"https://placehold.co/300x180",
    name:"Central Park",
    crowdLevel:50
  },
    {
    image:"https://placehold.co/300x180",
    name:"Empire state building",
    crowdLevel:100
  },
    {
    image:"https://placehold.co/300x180",
    name:"Wall street",
    crowdLevel:65
  },
    {
    image:"https://placehold.co/300x180",
    name:"China Town",
    crowdLevel:20
  },
]

function App() {
  return (
    <main className="app">
      <section className="page-container">
        
        {/* The header was extracted and put in the components so it can be reused later  */}
        <Header />
        
        {/* Searchbar was extracted and is in components again for future reuse  */}
        <SearchBar />

        <div className="tabs">
          <button>Landmarks</button>
          <button>Museums</button>
          <button>Parks</button>
        </div>

        <section className="cards">
        
         {
          //the .map function basically goes through the array we created up top and for each attraction creates a card on the page
         attractionsArray.map((attraction) => (
            <AttractionCard
            // a key is used in react to give an identifier, for now its the name but presuming the db we use will have an id or something later 
            key={attraction.name}
            image={attraction.image}
            name={attraction.name}
            crowdLevel={attraction.crowdLevel}
             />

            ))
         }
        

          
          
        </section>
      </section>
    </main>
  );
}

export default App;