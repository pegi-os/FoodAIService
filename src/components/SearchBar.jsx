import { Search, MapPin } from "lucide-react";

export default function SearchBar({ query, setQuery }) {
  return (
    <section className="search-row">
      <div className="search-box">
        <Search size={20} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="음식점 이름, 메뉴, 키워드 검색"
        />
      </div>
      <button className="location-btn"><MapPin size={19} /> 현재 위치</button>
    </section>
  );
}
