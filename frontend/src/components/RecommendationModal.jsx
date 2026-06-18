import { useState } from "react";
import { LoaderCircle, MessageSquareText, Sparkles, X } from "lucide-react";
import { recommendRestaurants } from "../api/restaurants";

const examples = [
  "오늘 기분이 좀 가라앉아서 따뜻하고 든든한 걸 먹고 싶어",
  "가볍게 점심 먹고 바로 이동해야 해",
  "조용하게 커피 마시면서 기분 전환하고 싶어"
];

const toText = (items) => (Array.isArray(items) && items.length > 0 ? items.join(", ") : "분석 중");

export default function RecommendationModal({ open, onClose }) {
  const [prompt, setPrompt] = useState("");
  const [agentResult, setAgentResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  if (!open) return null;

  const runRecommendation = async () => {
    const nextPrompt = prompt.trim();
    if (nextPrompt.length < 2) {
      setError("지금 상태나 먹고 싶은 느낌을 두 글자 이상 적어주세요.");
      return;
    }

    setStatus("loading");
    setError("");
    try {
      const data = await recommendRestaurants(nextPrompt);
      const normalized = Array.isArray(data) ? { recommendations: data } : data;
      setAgentResult(normalized ?? { recommendations: [] });
      setStatus("done");
    } catch {
      setAgentResult(null);
      setStatus("error");
      setError("추천을 가져오지 못했어요. 백엔드 서버가 켜져 있는지 확인해주세요.");
    }
  };

  const userState = agentResult?.userState;
  const recommendations = agentResult?.recommendations ?? [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="recommend-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose} type="button">
          <X size={24} />
        </button>

        <div className="recommend-head">
          <div className="recommend-icon">
            <Sparkles size={22} />
          </div>
          <div>
            <h2>AI 음식점 추천 Agent</h2>
            <p>사용자 상태를 분석한 뒤 Agent 1의 AI 종합 리뷰와 비교해 1~3위를 추천합니다.</p>
          </div>
        </div>

        <label className="prompt-box">
          <span>
            <MessageSquareText size={17} />내 상태
          </span>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="예: 오늘 비도 오고 몸이 좀 지쳐서 따뜻한 국물이나 든든한 밥이 먹고 싶어"
            rows={5}
          />
        </label>

        <div className="prompt-examples">
          {examples.map((example) => (
            <button key={example} type="button" onClick={() => setPrompt(example)}>
              {example}
            </button>
          ))}
        </div>

        {error && <div className="recommend-error">{error}</div>}

        <div className="recommend-actions">
          <button className="recommend-submit" type="button" onClick={runRecommendation} disabled={status === "loading"}>
            {status === "loading" ? <LoaderCircle className="spin" size={18} /> : <Sparkles size={18} />}
            Agent 추천 실행
          </button>
        </div>

        {userState && (
          <div className="user-state-box">
            <strong>Agent 2 사용자 상태 분석</strong>
            <div>
              <span>기분: {userState.mood || "분석 중"}</span>
              <span>배고픔: {userState.hungerLevel || "분석 중"}</span>
              <span>온도 선호: {userState.temperaturePreference || "상관없음"}</span>
              <span>우선순위: {toText(userState.priority)}</span>
            </div>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="recommend-results">
            {recommendations.map((item) => (
              <article className="recommend-card" key={item.id}>
                <div className="recommend-rank">{item.rank}</div>
                <div>
                  <div className="recommend-title-row">
                    <h3>{item.name}</h3>
                    <span>{item.fitScore}점</span>
                  </div>
                  <p className="recommend-meta">
                    {item.category || "분류 없음"} · {item.address}
                  </p>
                  <p className="recommend-reason">{item.reason}</p>
                  {item.matchedFactors?.length > 0 && (
                    <div className="factor-row">
                      {item.matchedFactors.map((factor) => (
                        <span key={factor}>{factor}</span>
                      ))}
                    </div>
                  )}
                  {item.summary && <p className="recommend-summary">Agent 1 종합 리뷰: {item.summary}</p>}
                  {item.caution && <p className="recommend-caution">{item.caution}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
