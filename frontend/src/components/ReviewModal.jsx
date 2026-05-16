import {
  X,
  List,
  ThumbsUp,
  AlertTriangle,
  MessageCircle,
  Users,
  Coins,
  RefreshCw,
  Armchair,
  Sparkles
} from "lucide-react";
import FoodThumb from "./FoodThumb";

function Insight({ icon, title, value }) {
  return (
    <div className="insight-card">
      {icon}
      <div>
        <strong>{title}</strong>
        <p>{value}</p>
      </div>
    </div>
  );
}

export default function ReviewModal({ restaurant, onClose }) {
  if (!restaurant) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="review-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} type="button">
          <X size={25} />
        </button>

        <div className="modal-top">
          <FoodThumb color={restaurant.color} />
          <div className="modal-title-block">
            <h2>{restaurant.name}</h2>
            <p>
              {restaurant.district} · {restaurant.category}
            </p>
            <div className="tag-row modal-tags">
              {restaurant.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          <div className="modal-score">
            <div>
              <Sparkles size={17} /> AI {restaurant.score}
            </div>
            <p>리뷰 {restaurant.reviewCount}개 기반</p>
          </div>
        </div>

        <div className="ai-review-box">
          <h3>
            <span>AI</span> 종합 리뷰
          </h3>
          <p>{restaurant.fullReview}</p>
        </div>

        <div className="pros-cons-grid">
          <div className="analysis-box pros-box">
            <h3>
              <ThumbsUp size={20} /> AI가 뽑은 장점
            </h3>
            <ul>
              {restaurant.pros.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="analysis-box cons-box">
            <h3>
              <AlertTriangle size={20} /> AI가 뽑은 주의점
            </h3>
            <ul>
              {restaurant.cons.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="keyword-section">
          <h3>
            <List size={18} /> 리뷰 키워드
          </h3>
          <div className="keyword-row">
            {restaurant.keywords.map((keyword) => (
              <span key={keyword}>{keyword}</span>
            ))}
          </div>
        </div>

        <div className="review-section">
          <h3>
            <MessageCircle size={18} /> 대표 리뷰 예시
          </h3>
          <div className="review-grid">
            {restaurant.reviews.map((review, index) => (
              <article className="quote-card" key={`${review.source}-${index}`}>
                <p>“{review.text}”</p>
                <span>{review.source}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="insight-row">
          <Insight icon={<Users size={24} />} title="추천 대상" value={restaurant.extra.target} />
          <Insight icon={<Armchair size={24} />} title="분위기" value={restaurant.extra.mood} />
          <Insight icon={<Coins size={24} />} title="가성비" value={restaurant.extra.value} />
          <Insight icon={<RefreshCw size={24} />} title="재방문 의사" value={restaurant.extra.revisit} />
        </div>
      </section>
    </div>
  );
}

