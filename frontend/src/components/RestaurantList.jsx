import { List, SlidersHorizontal } from "lucide-react";
import RestaurantCard from "./RestaurantCard";

export default function RestaurantList({
  filtered,
  categories,
  category,
  setCategory,
  selectedId,
  onOpen,
  onHover
}) {
  // categories가 안 넘어오면(호환) filtered 기준으로 fallback
  const categoryItems =
    categories && categories.length > 0
      ? categories
      : ["전체", ...Array.from(new Set(filtered.map((r) => r.category)))];

  return (
    <aside className="list-panel panel">
      <div className="panel-head">
        <h2>
          <List size={21} /> 음식점 리스트
        </h2>
        <button className="sort-btn" type="button">
          <SlidersHorizontal size={15} /> 최신순
        </button>
      </div>

      <div className="category-row">
        {categoryItems.map((item) => (
          <button
            key={item}
            onClick={() => setCategory((prev) => (prev === item ? "전체" : item))}
            className={`category-chip ${category === item ? "active" : ""}`}
            type="button"
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
