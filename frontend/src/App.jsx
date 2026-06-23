import { useEffect, useMemo, useState } from "react";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import RestaurantList from "./components/RestaurantList";
import MapSection from "./components/MapSection";
import ReviewModal from "./components/ReviewModal";
import ChatDock from "./components/ChatDock";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { getRestaurants } from "./api/restaurants";
import "./styles/index.css";

const COLORS = ["meat", "cafe", "tteok", "chicken", "green"];
const CATEGORY_ORDER = ["전체", "한식", "양식", "중식", "일식", "카페", "분식", "아시아", "패스트푸드", "주점", "기타"];
const CATEGORY_RULES = [
  ["카페", ["카페", "디저트", "베이커리", "케이크", "도넛", "아이스크림", "떡카페"]],
  ["중식", ["중식", "마라", "양꼬치"]],
  ["일식", ["일식", "일본", "초밥", "롤", "생선회", "이자카야", "돈가스", "카레"]],
  ["양식", ["양식", "이탈리아", "파스타", "스파게티", "피자", "패밀리레스토랑", "브런치", "샐러드", "샌드위치"]],
  ["아시아", ["베트남", "아시아", "샤브샤브"]],
  ["분식", ["분식", "떡볶이", "김밥", "순대", "도시락", "컵밥"]],
  ["패스트푸드", ["햄버거", "치킨", "닭강정", "핫도그", "푸드코트"]],
  ["주점", ["주점", "맥주", "호프", "포장마차"]],
  [
    "한식",
    [
      "한식", "고기", "육류", "곱창", "막창", "국밥", "국수", "칼국수", "만두", "닭갈비",
      "돼지고기", "해물", "생선", "낙지", "장어", "족발", "보쌈", "냉면", "두부", "감자탕",
      "백숙", "삼계탕", "오리", "정육", "추어탕", "아귀", "복어", "매운탕", "뷔페"
    ]
  ]
];

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const unique = (items) => Array.from(new Set(items.filter(Boolean)));

const randomizeScore = (score, id) => {
  const numericId = Number(id) || 0;
  const pseudoRandom = ((Math.imul(numericId + 17, 9301) + 49297) % 233280) / 233280;
  const jitter = pseudoRandom * 0.6 - 0.3;
  return Math.min(5, Math.max(0, score + jitter));
};

const normalizeCategory = (value = "") => {
  const label = value.toLowerCase();
  const matched = CATEGORY_RULES.find(([, keywords]) =>
    keywords.some((keyword) => label.includes(keyword))
  );
  return matched?.[0] || "기타";
};

const guessDistrict = (address = "") => {
  if (address.includes("장안구")) return "장안구";
  if (address.includes("팔달구")) return "팔달구";
  if (address.includes("권선구")) return "권선구";
  if (address.includes("영통구")) return "영통구";
  return "수원";
};

const adaptRestaurant = (row, index) => {
  const originalCategory = row.category ?? "미분류";
  const category = normalizeCategory(originalCategory);
  const strengths = toArray(row.pros?.main_strengths);
  const weaknessItems = toArray(row.cons?.main_weaknesses);
  const cautionItems = toArray(row.cons?.caution_points);
  const recommendedMenus = toArray(row.recommendedFor?.recommended_menus).map((item) =>
    typeof item === "string" ? item : item?.menu
  );
  const score = Number.parseFloat(row.valueForMoney);
  const baseScore = Number.isFinite(score) ? score : 4.2;
  const randomizedScore = randomizeScore(baseScore, row.id);
  const reviewCount = Number(row.reviewCount) || row.reviews?.length || 0;
  const aiSummary = row.aiSummary || "아직 등록된 AI 요약이 없습니다.";
  const reviewSamples = toArray(row.reviews).map((review) => ({
    text: review.content,
    source: review.written_at || "날짜 정보 없음"
  }));
  const keywords = unique([
    category,
    originalCategory,
    ...strengths.slice(0, 3),
    ...recommendedMenus.slice(0, 2)
  ]);

  return {
    id: row.id,
    name: row.name,
    district: guessDistrict(row.address),
    category,
    score: randomizedScore.toFixed(1),
    reviewCount,
    summary: aiSummary.split("\n")[0],
    tags: unique([category, originalCategory, ...strengths.slice(0, 1), ...recommendedMenus.slice(0, 1)]),
    keywords: keywords.length > 0 ? keywords : [category, "리뷰", "맛집"],
    color: COLORS[index % COLORS.length],
    position: { left: "50%", top: "50%" },
    fullReview: aiSummary,
    pros: strengths.length > 0 ? strengths : ["AI 장점 데이터가 아직 없습니다."],
    cons:
      [...weaknessItems, ...cautionItems].length > 0
        ? [...weaknessItems, ...cautionItems]
        : ["특별히 정리된 주의점이 없습니다."],
    reviews:
      reviewSamples.length > 0
        ? reviewSamples
        : [{ text: "아직 연결된 대표 리뷰가 없습니다.", source: "DB 리뷰" }],
    extra: {
      target: row.recommendedFor?.recommended_customer || row.revisitIntent || "추천 대상 정보 없음",
      mood: row.atmosphere || "분위기 정보 없음",
      value: `AI 점수 ${randomizedScore.toFixed(1)}`,
      revisit: row.revisitIntent || "재방문 정보 없음"
    },
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
      .then((rows) => {
        setDbRestaurants(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        setDbRestaurants([]);
      });
  }, []);

  const restaurants = useMemo(
    () => dbRestaurants.map((restaurant, index) => adaptRestaurant(restaurant, index)),
    [dbRestaurants]
  );

  const categories = useMemo(() => {
    const available = new Set(restaurants.map((restaurant) => restaurant.category));
    return CATEGORY_ORDER.filter((item) => item === "전체" || available.has(item));
  }, [restaurants]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return restaurants.filter((restaurant) => {
      const matchesQuery =
        !q ||
        restaurant.name.toLowerCase().includes(q) ||
        restaurant.category.toLowerCase().includes(q) ||
        restaurant.district.toLowerCase().includes(q) ||
        restaurant.tags.some((tag) => tag.toLowerCase().includes(q)) ||
        restaurant.keywords.some((keyword) => keyword.toLowerCase().includes(q));

      const matchesCategory = category === "전체" || restaurant.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [restaurants, query, category]);

  const openDetail = (restaurant) => {
    setSelectedId(restaurant.id);
    setModalRestaurant(restaurant);
  };

  return (
    <AppErrorBoundary>
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
        <ChatDock />
      </div>
    </AppErrorBoundary>
  );
}
