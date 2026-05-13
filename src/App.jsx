import { useMemo, useState } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import RestaurantList from "./components/RestaurantList";
import MapSection from "./components/MapSection";
import ReviewModal from "./components/ReviewModal";
import { restaurants } from "./data/restaurants";
import "./styles/index.css";

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [selectedId, setSelectedId] = useState(1);
  const [modalRestaurant, setModalRestaurant] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return restaurants.filter((r) => {
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.district.toLowerCase().includes(q) ||
        r.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        r.keywords.some((keyword) => keyword.toLowerCase().includes(q));

      const matchesCategory = category === "전체" || r.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  const selected = restaurants.find((item) => item.id === selectedId) || restaurants[0];

  const openDetail = (restaurant) => {
    setSelectedId(restaurant.id);
    setModalRestaurant(restaurant);
  };

  return (
    <div className="app">
      <Header />
      <SearchBar query={query} setQuery={setQuery} />

      <main className="main-layout">
        <RestaurantList
          filtered={filtered}
          category={category}
          setCategory={setCategory}
          selectedId={selectedId}
          onOpen={openDetail}
          onHover={setSelectedId}
        />
        <MapSection
          restaurants={restaurants}
          selected={selected}
          selectedId={selectedId}
          onOpen={openDetail}
          onHover={setSelectedId}
        />
      </main>

      <ReviewModal restaurant={modalRestaurant} onClose={() => setModalRestaurant(null)} />
    </div>
  );
}
