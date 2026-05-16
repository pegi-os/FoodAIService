import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import RestaurantList from "./components/RestaurantList";
import MapSection from "./components/MapSection";
import ReviewModal from "./components/ReviewModal";
import { getRestaurants } from "./api/restaurants";
import "./styles/index.css";

const COLORS = ["meat", "cafe", "tteok", "chicken", "green"];

const guessDistrict = (address = "") => {
  if (address.includes("장안구")) return "장안구";
  if (address.includes("팔달구")) return "팔달구";
  if (address.includes("권선구")) return "권선구";
  if (address.includes("영통구")) return "영통구";
  return "수원";
};

const adaptRestaurant = (row, index) => {
  const category = row.category ?? "미분류";
  return {
    id: row.id,
    name: row.name,
    district: guessDistrict(row.address),
    category,
    score: 4.2,
    reviewCount: 50,
    summary: `${category} · ${row.address}`,
    tags: [category, "추천", "더미"],
    keywords: [category, "리뷰", "맛집"],
    color: COLORS[index % COLORS.length],
    position: { left: "50%", top: "50%" },
    fullReview: "DB 연동 테스트용 AI 종합 리뷰 더미 텍스트입니다.",
    pros: ["장점 더미 1", "장점 더미 2"],
    cons: ["주의점 더미 1"],
    reviews: [{ text: "대표 리뷰 더미 문장입니다.", source: "DB 더미" }],
    extra: { target: "테스트", mood: "캐주얼한", value: "보통", revisit: "보통" },
    lat: row.lat,
    lng: row.lng,
    address: row.address
  };
};

export default function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("전체");
  const [selectedId, setSelectedId] = useState(0);
  const [modalRestaurant, setModalRestaurant] = useState(null);

  const [dbRestaurants, setDbRestaurants] = useState([]);

  useEffect(() => {
    getRestaurants()
      .then((rows) => setDbRestaurants(Array.isArray(rows) ? rows : []))
      .catch(() => setDbRestaurants([]));
  }, []);

  const restaurants = useMemo(
    () => dbRestaurants.map((r, idx) => adaptRestaurant(r, idx)),
    [dbRestaurants]
  );

  const categories = useMemo(() => {
    const uniq = new Set(restaurants.map((r) => r.category));
    return ["전체", ...Array.from(uniq)];
  }, [restaurants]);

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
  }, [restaurants, query, category]);

  const selected = selectedId ? restaurants.find((item) => item.id === selectedId) : null;

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
          categories={categories}
          category={category}
          setCategory={setCategory}
          selectedId={selectedId}
          onOpen={openDetail}
          onHover={setSelectedId}
        />
        <MapSection
          restaurants={restaurants}
          selectedId={selectedId}
          onHover={setSelectedId}
          onOpen={openDetail}
        />
      </main>

      <ReviewModal restaurant={modalRestaurant} onClose={() => setModalRestaurant(null)} />
    </div>
  );
}
