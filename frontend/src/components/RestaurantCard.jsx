import { Coffee, Drumstick, Soup, UtensilsCrossed } from "lucide-react";
import FoodThumb from "./FoodThumb";

function CategoryIcon({ category }) {
  const label = (category ?? "").toLowerCase();

  if (label.includes("카페") || label.includes("coffee")) return <Coffee size={14} />;
  if (label.includes("치킨")) return <Drumstick size={14} />;
  if (label.includes("학식") || label.includes("급식")) return <UtensilsCrossed size={14} />;
  if (label.includes("국") || label.includes("탕") || label.includes("찌개")) return <Soup size={14} />;
  return <UtensilsCrossed size={14} />;
}

export default function RestaurantCard({ restaurant, selected, onOpen, onHover }) {
  return (
    <button
      onClick={() => onOpen(restaurant)}
      onMouseEnter={() => onHover(restaurant.id)}
      className={`restaurant-card ${selected ? "selected" : ""}`}
      type="button"
    >
      <FoodThumb color={restaurant.color} />
      <div className="card-info">
        <div className="card-title-row">
          <h3>{restaurant.name}</h3>
          <div className={`score-badge ${restaurant.score >= 4.5 ? "orange" : "green"}`}>
            AI {restaurant.score}
          </div>
        </div>
        <p className="meta">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <CategoryIcon category={restaurant.category} />
            {restaurant.district} · {restaurant.category}
          </span>
        </p>
        <p className="summary">{restaurant.summary}</p>
        <div className="tag-row">
          {restaurant.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
    </button>
  );
}
