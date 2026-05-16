import { useEffect, useRef, useState } from "react";
import { MapPin, Minus, Plus, RotateCcw } from "lucide-react";

export default function MapSection({ restaurants = [], selectedId, onHover, onOpen }) {
  // 카카오맵이 붙을 DOM 컨테이너
  const mapRef = useRef(null);

  // 생성된 map 인스턴스
  const mapInstanceRef = useRef(null);

  // 지도 마커 인스턴스들(갱신 시 제거용)
  const markersRef = useRef([]);

  // 선택된 식당 말풍선 오버레이
  const overlayRef = useRef(null);

  // 로딩/에러 상태 표시용
  const [mapStatus, setMapStatus] = useState("idle"); // idle | loading | ready | error
  const [mapError, setMapError] = useState("");

  // 기본 뷰(초기 위치/레벨) - 성균관대 자연과학캠퍼스(수원)
  const defaultCenter = { lat: 37.293889, lng: 126.974444 };
  const defaultLevel = 5;

  const ICONS = {
    coffee: [
      ["path", { d: "M10 2v2" }],
      ["path", { d: "M14 2v2" }],
      [
        "path",
        {
          d: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"
        }
      ],
      ["path", { d: "M6 2v2" }]
    ],
    drumstick: [
      ["path", { d: "M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23" }],
      [
        "path",
        {
          d: "m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59"
        }
      ]
    ],
    soup: [
      ["path", { d: "M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z" }],
      ["path", { d: "M7 21h10" }],
      ["path", { d: "M19.5 12 22 6" }],
      [
        "path",
        {
          d: "M16.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.73 1.62"
        }
      ],
      [
        "path",
        {
          d: "M11.25 3c.27.1.8.53.74 1.36-.05.83-.93 1.2-.98 2.02-.06.78.33 1.24.72 1.62"
        }
      ],
      [
        "path",
        {
          d: "M6.25 3c.27.1.8.53.75 1.36-.06.83-.93 1.2-1 2.02-.05.78.34 1.24.74 1.62"
        }
      ]
    ],
    utensils: [
      ["path", { d: "m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" }],
      [
        "path",
        {
          d: "M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7"
        }
      ],
      ["path", { d: "m2.1 21.8 6.4-6.3" }],
      ["path", { d: "m19 5-7 7" }]
    ]
  };

  const renderLucideSvg = (iconNode) =>
    iconNode
      .map(([tag, attrs]) => {
        const attrString = Object.entries(attrs)
          .map(([k, v]) => `${k}="${String(v)}"`)
          .join(" ");
        return `<${tag} ${attrString} />`;
      })
      .join("");

  const markerSvgDataUrl = (category) => {
    // 카테고리별 마커 아이콘(리스트 아이콘과 동일한 lucide 스타일: 배경 없음)
    const label = (category ?? "").toLowerCase();
    const iconKey =
      label.includes("카페") || label.includes("coffee")
        ? "coffee"
        : label.includes("치킨")
          ? "drumstick"
          : label.includes("국") || label.includes("탕") || label.includes("찌개")
            ? "soup"
            : "utensils";

    const iconNode = ICONS[iconKey] ?? ICONS.utensils;
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24">
        <defs>
          <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.22"/>
          </filter>
        </defs>
        <g filter="url(#s)" fill="none" stroke="#2f8a3b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          ${renderLucideSvg(iconNode)}
        </g>
      </svg>
    `;

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  useEffect(() => {
    // 최초 렌더 이후 1회: SDK 로드 + 지도 초기화
    setMapStatus("loading");
    setMapError("");

    // 스크립트 로드가 안 끝나는 상황 대비 타임아웃
    const timeoutId = setTimeout(() => {
      setMapStatus("error");
      setMapError("Timeout while loading Kakao Maps");
    }, 8000);

    const apiKey = import.meta.env.VITE_KAKAO_API_KEY;
    if (!apiKey) {
      setMapStatus("error");
      setMapError("Missing VITE_KAKAO_API_KEY (check frontend/.env and restart dev server)");
      clearTimeout(timeoutId);
      return () => clearTimeout(timeoutId);
    }

    // 카카오 SDK 로드(없으면 추가, 있으면 재사용)
    const loadKakao = () =>
      new Promise((resolve, reject) => {
        const existingScript = document.getElementById("kakao-map-script");

        const onReady = () => {
          if (!window.kakao?.maps?.load) return reject(new Error("Kakao maps not available"));
          window.kakao.maps.load(() => resolve(window.kakao));
        };

        if (window.kakao?.maps?.load) return onReady();

        if (existingScript) {
          existingScript.addEventListener("load", onReady, { once: true });
          existingScript.addEventListener("error", () => reject(new Error("Failed to load Kakao Maps")), {
            once: true
          });
          return;
        }

        const script = document.createElement("script");
        script.id = "kakao-map-script";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`;
        script.async = true;
        script.addEventListener("load", onReady, { once: true });
        script.addEventListener("error", () => reject(new Error("Failed to load Kakao Maps")), {
          once: true
        });
        document.head.appendChild(script);
      });

    // 실제 지도 생성
    const initMap = () => {
      const container = mapRef.current;
      if (!container) return;
      if (!window.kakao?.maps) return;

      const options = {
        // 성균관대 자연과학캠퍼스(수원) 부근에서 시작
        center: new window.kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng),
        level: defaultLevel
      };

      const map = new window.kakao.maps.Map(container, options);
      mapInstanceRef.current = map;

      setMapStatus("ready");
      clearTimeout(timeoutId);
    };

    loadKakao()
      .then(initMap)
      .catch((err) => {
        setMapStatus("error");
        setMapError(err?.message || String(err));
        clearTimeout(timeoutId);
      });

    return () => clearTimeout(timeoutId);
  }, []);

  const zoomIn = () => {
    // 레벨 숫자가 작아질수록 확대
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setLevel(map.getLevel() - 1);
  };

  const zoomOut = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.setLevel(map.getLevel() + 1);
  };

  const resetOrientation = () => {
    // 카카오맵은 기본적으로 회전(방위) UI가 없는 경우가 많아서,
    // 여기서는 "초기 뷰(센터/레벨)로 복귀"로 동작시킴
    const map = mapInstanceRef.current;
    if (!map) return;

    const center = new window.kakao.maps.LatLng(defaultCenter.lat, defaultCenter.lng);
    map.setLevel(defaultLevel);
    map.panTo(center);
  };

  useEffect(() => {
    // DB에서 불러온 식당 목록을 지도 마커로 표시(lat/lng 있는 항목만)
    if (mapStatus !== "ready") return;
    if (!mapInstanceRef.current) return;
    if (!window.kakao?.maps) return;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const map = mapInstanceRef.current;

    restaurants.forEach((r) => {
      if (typeof r?.lat !== "number" || typeof r?.lng !== "number") return;

      const imageSrc = markerSvgDataUrl(r.category);
      const imageSize = new window.kakao.maps.Size(34, 34);
      const imageOption = { offset: new window.kakao.maps.Point(17, 34) };
      const markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize, imageOption);

      const marker = new window.kakao.maps.Marker({
        position: new window.kakao.maps.LatLng(r.lat, r.lng),
        image: markerImage
      });
      marker.setMap(map);

      // 호버 시 선택 처리
      if (typeof onHover === "function") {
        window.kakao.maps.event.addListener(marker, "mouseover", () => onHover(r.id));
        window.kakao.maps.event.addListener(marker, "mouseout", () => onHover(0));
      }

      // 클릭 시 리스트 클릭과 동일하게 상세 오픈
      if (typeof onOpen === "function") {
        window.kakao.maps.event.addListener(marker, "click", () => onOpen(r));
      }

      markersRef.current.push(marker);
    });
  }, [restaurants, mapStatus, onHover, onOpen]);

  useEffect(() => {
    // 선택된 식당에 말풍선(오버레이) 표시
    if (mapStatus !== "ready") return;
    if (!mapInstanceRef.current) return;
    if (!window.kakao?.maps) return;

    // 기존 오버레이 제거
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }

    // 선택 해제면 말풍선도 표시하지 않음
    if (!selectedId) return;

    const r = restaurants.find((item) => item.id === selectedId);
    if (!r) return;
    if (typeof r.lat !== "number" || typeof r.lng !== "number") return;

    const position = new window.kakao.maps.LatLng(r.lat, r.lng);
    const map = mapInstanceRef.current;

    // 간단 HTML 오버레이(React 컴포넌트 대신 문자열)
    const content = `
      <div style="
        background:#fff;
        border-radius:12px;
        box-shadow:0 14px 32px rgba(25,22,19,0.18);
        padding:12px 14px;
        min-width:220px;
        border:1px solid rgba(0,0,0,0.06);
        font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
      ">
        <div style="font-weight:800;color:#e66a00;margin-bottom:4px;">${r.name}</div>
        <div style="font-size:12px;color:#4b443e;line-height:1.35;">${r.address}</div>
      </div>
    `;

    const overlay = new window.kakao.maps.CustomOverlay({
      position,
      content,
      // 마커 아이콘을 가리지 않도록 말풍선을 조금 더 위로
      yAnchor: 1.8
    });
    overlay.setMap(map);
    overlayRef.current = overlay;

    // 선택 시 해당 위치로 이동
    // map.panTo(position);
  }, [restaurants, selectedId, mapStatus]);

  return (
    <section className="map-panel panel">
      <div className="panel-head map-head">
        <h2>
          <MapPin size={21} /> 지도
        </h2>
      </div>

      <div className="fake-map">
        {/* 카카오맵이 렌더링될 영역 */}
        <div ref={mapRef} className="kakao-map" />

        {/* 지도 컨트롤(UI) */}
        {mapStatus === "ready" && (
          <div
            style={{
              position: "absolute",
              right: 16,
              top: 16,
              zIndex: 30,
              display: "grid",
              gap: 10
            }}
          >
            {/* 확대/축소 */}
            <button
              type="button"
              onClick={zoomIn}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(255,255,255,0.95)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                color: "#222"
              }}
              title="확대"
            >
              <Plus size={20} />
            </button>
            <button
              type="button"
              onClick={zoomOut}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(255,255,255,0.95)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                color: "#222"
              }}
              title="축소"
            >
              <Minus size={20} />
            </button>

            {/* 방위 초기화(초기 뷰로 복귀) */}
            <button
              type="button"
              onClick={resetOrientation}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                border: "1px solid rgba(0,0,0,0.08)",
                background: "rgba(255,255,255,0.95)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                color: "#222"
              }}
              title="초기 뷰로 복귀"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        )}

        {/* 로딩/에러 표시(필요 없으면 삭제 가능) */}
        {mapStatus !== "ready" && (
          <div
            style={{
              position: "absolute",
              left: 12,
              bottom: 12,
              zIndex: 20,
              background: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              padding: "10px 12px",
              fontSize: 12,
              color: "#2f2f2f",
              maxWidth: 360
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              Kakao map: {mapStatus === "loading" ? "loading…" : mapStatus}
            </div>
            {mapError && <div style={{ opacity: 0.9 }}>{mapError}</div>}
          </div>
        )}
      </div>
    </section>
  );
}
