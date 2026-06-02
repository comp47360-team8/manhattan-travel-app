//props are the data passed from a parent to a child to customize behaviour, allows for reusable assets with customizable info thats different for each
type AttactionCardProps={
    image: string;
    name: string;
    crowdLevel: number;

};

function AttractionCard({image, name, crowdLevel}: AttactionCardProps){
return(
<article className="attraction-card">
    <img src={image} alt={name}/>
    <h2>{name}</h2>
    <p>Crowd Level: {crowdLevel}%</p>
</article>
    );
}
export default AttractionCard;