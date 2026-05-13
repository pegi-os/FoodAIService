import { MapPin, Navigation, Utensils } from "lucide-react";
import FoodThumb from "./FoodThumb";

export default function MapSection({ restaurants, selected, selectedId, onOpen, onHover }) {
  return (
    <section className="map-panel panel">
      <div className="panel-head map-head"><h2><MapPin size={21} /> 지도</h2></div>

      <div className="fake-map">
        <div className="district label jang">장안구</div>
        <div className="district label pal">팔달구</div>
        <div className="district label yeong">영통구</div>
        <div className="district label gwon">권선구</div>
        <div className="place-label cityhall">수원시청</div>
        <div className="place-label lake">광교호수공원</div>
        <div className="place-label station">수원역</div>
        <div className="road road-1" /><div className="road road-2" /><div className="road road-3" /><div className="road road-4" /><div className="road road-5" />
        <div className="water" /><div className="park park-1" /><div className="park park-2" />

        {restaurants.map((restaurant) => (
          <button
            key={restaurant.id}
            className={`map-marker ${selectedId === restaurant.id ? "active" : ""}`}
            style={{ left: restaurant.position.left, top: restaurant.position.top }}
            onClick={() => onOpen(restaurant)}
            onMouseEnter={() => onHover(restaurant.id)}
          >
            <Utensils size={18} />
          </button>
        ))}

        <div
          className="map-bubble"
          style={{ left: `calc(${selected.position.left} + 18px)`, top: `calc(${selected.position.top} - 72px)` }}
          onClick={() => onOpen(selected)}
        >
          <FoodThumb color={selected.color} />
          <div><strong>{selected.name}</strong><p>{selected.summary}</p></div>
        </div>

        <div className="map-control zoom-plus">+</div>
        <div className="map-control zoom-minus">−</div>
        <div className="map-control locate"><Navigation size={17} /></div>
      </div>
    </section>
  );
}
