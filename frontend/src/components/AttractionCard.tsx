//props are the data passed from a parent to a child to customize behaviour, need them to generate the cards on the main page 
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