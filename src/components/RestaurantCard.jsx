import FoodThumb from "./FoodThumb";

export default function RestaurantCard({ restaurant, selected, onOpen, onHover }) {
  return (
    <button
      onClick={() => onOpen(restaurant)}
      onMouseEnter={() => onHover(restaurant.id)}
      className={`restaurant-card ${selected ? "selected" : ""}`}
    >
      <FoodThumb color={restaurant.color} />
      <div className="card-info">
        <div className="card-title-row">
          <h3>{restaurant.name}</h3>
          <div className={`score-badge ${restaurant.score >= 4.5 ? "orange" : "green"}`}>AI {restaurant.score}</div>
        </div>
        <p className="meta">{restaurant.district} · {restaurant.category}</p>
        <p className="summary">{restaurant.summary}</p>
        <div className="tag-row">
          {restaurant.tags.map((tag) => <span key={tag}>{tag}</span>)}
        </div>
      </div>
    </button>
  );
}
