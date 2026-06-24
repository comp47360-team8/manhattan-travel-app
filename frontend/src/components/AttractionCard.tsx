import { useState } from "react";

//props are the data passed from a parent to a child to customize behaviour, allows for reusable assets with customizable info thats different for each
type AttactionCardProps={
    image: string;
    name: string;
    crowdLevel: number;
    bestTime: string;
    category: string;

};


function AttractionCard({image, name, crowdLevel, bestTime,category}: AttactionCardProps){
const [saved, setSaved] = useState(false);
return(
    
<article className="attraction-card">
    <button
        className="save-button"
        onClick={() => setSaved(!saved)}
    >
        {saved ? "♥" : "♡"}
    </button>

    <img src={image} alt={name}/>
    <h2>{name}</h2>
    <p>Crowd Level: {crowdLevel}%</p>
    <p>Best Time: {bestTime}</p>
    <p>Category: {category}</p>
</article>
    );
}
export default AttractionCard;