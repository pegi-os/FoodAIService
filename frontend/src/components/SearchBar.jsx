import { useState } from "react";
import { CloudSun, LoaderCircle, Search, Sparkles, X } from "lucide-react";
import { getWeatherRecommendation } from "../api/ai";

const CAMPUS_POSITION = {
  latitude: 37.293,
  longitude: 126.975
};

const getCurrentPosition = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(CAMPUS_POSITION);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude
        }),
      () => resolve(CAMPUS_POSITION),
      {
        enableHighAccuracy: false,
        timeout: 6000,
        maximumAge: 300000
      }
    );
  });

export default function SearchBar({ query, setQuery }) {
  const [weatherState, setWeatherState] = useState({
    status: "idle",
    data: null,
    error: ""
  });

  const loadWeatherRecommendation = async () => {
    if (weatherState.status === "loading") return;
    setWeatherState({ status: "loading", data: null, error: "" });

    try {
      const position = await getCurrentPosition();
      const data = await getWeatherRecommendation(position);
      setWeatherState({ status: "ready", data, error: "" });
    } catch (error) {
      setWeatherState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "날씨 추천을 불러오지 못했습니다."
      });
    }
  };

  return (
    <section className="search-area">
      <div className="search-row">
        <div className="search-box">
          <Search size={20} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="음식점 이름/카테고리/키워드 검색"
          />
        </div>
        <button
          className="weather-btn"
          type="button"
          onClick={loadWeatherRecommendation}
          disabled={weatherState.status === "loading"}
        >
          {weatherState.status === "loading" ? (
            <LoaderCircle className="weather-spinner" size={19} />
          ) : (
            <CloudSun size={19} />
          )}
          {weatherState.data
            ? `${weatherState.data.temperature.toFixed(1)}° ${weatherState.data.weather_description}`
            : "현재 날씨"}
        </button>
      </div>

      {weatherState.data || weatherState.error ? (
        <div className={`weather-panel ${weatherState.error ? "weather-panel--error" : ""}`}>
          <div className="weather-panel__head">
            <div>
              <strong>
                <Sparkles size={16} /> 날씨 맞춤 메뉴 추천
              </strong>
              {weatherState.data ? (
                <span>
                  체감 {weatherState.data.apparent_temperature.toFixed(1)}°C · 강수{" "}
                  {weatherState.data.precipitation}mm
                </span>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="날씨 추천 닫기"
              onClick={() => setWeatherState({ status: "idle", data: null, error: "" })}
            >
              <X size={16} />
            </button>
          </div>
          <p>{weatherState.error || weatherState.data?.recommendation}</p>
        </div>
      ) : null}
    </section>
  );
}
