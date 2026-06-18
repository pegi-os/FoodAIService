import { Sparkles, Utensils } from "lucide-react";

export default function Header({ onOpenRecommend }) {
  return (
    <header className="top-header">
      <div className="brand">
        <div className="brand-icon">
          <Utensils size={24} />
        </div>
        <div>
          <div className="brand-name">
            맛<span>AI</span>
          </div>
          <div className="brand-sub">AI 리뷰 탐색 서비스</div>
        </div>
      </div>

      <div className="hero-title">
        <h1>
          수원 맛집 <span>AI</span> 리뷰 탐색
        </h1>
        <p>지도를 통해 수원 음식점을 검색하고 AI가 분석한 리뷰를 확인해보세요.</p>
      </div>

      <button className="recommend-open-btn" type="button" onClick={onOpenRecommend}>
        <Sparkles size={18} />
        AI 추천
      </button>
    </header>
  );
}
