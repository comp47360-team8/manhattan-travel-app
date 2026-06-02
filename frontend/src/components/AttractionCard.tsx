//props are the data passed from a parent to a child to customize behaviour, allows for reusable assets with customizable info thats different for each
type AttactionCardProps={
    image: string;
    name: string;
    crowdLevel: number;
    bestTime: string;
    category: string;

};

function AttractionCard({image, name, crowdLevel, bestTime,category}: AttactionCardProps){
return(
<article className="attraction-card">
    <img src={image} alt={name}/>
    <h2>{name}</h2>
    <p>Crowd Level: {crowdLevel}%</p>
    <p>Best Time: {bestTime}</p>
    <p>Category: {category}</p>
</article>
    );
}
export default AttractionCard;