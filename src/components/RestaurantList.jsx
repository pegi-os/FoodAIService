import { List, SlidersHorizontal } from "lucide-react";
import RestaurantCard from "./RestaurantCard";
import { categories } from "../data/restaurants";

export default function RestaurantList({ filtered, category, setCategory, selectedId, onOpen, onHover }) {
  return (
    <aside className="list-panel panel">
      <div className="panel-head">
        <h2><List size={21} /> 음식점 리스트</h2>
        <button className="sort-btn"><SlidersHorizontal size={15} /> 최신순</button>
      </div>

      <div className="category-row">
        {categories.map((item) => (
          <button
            key={item}
            onClick={() => setCategory(item)}
            className={`category-chip ${category === item ? "active" : ""}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="restaurant-list">
        {filtered.map((restaurant) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            selected={selectedId === restaurant.id}
            onOpen={onOpen}
            onHover={onHover}
          />
        ))}
        {filtered.length === 0 && <div className="empty-state">검색 결과가 없습니다.</div>}
      </div>
    </aside>
  );
}
