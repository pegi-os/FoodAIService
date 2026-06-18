const { db } = require("../db/sqlite");
const llmService = require("./llm.service");

const parseJsonArray = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
};

const list = () => {
  const stmt = db.prepare(
    "SELECT id, name, address, category, lat, lng, created_at, updated_at FROM restaurants ORDER BY id DESC"
  );
  return stmt.all();
};

const listAgentProfiles = () => {
  const rows = db
    .prepare(
      `
        SELECT
          r.id,
          r.name,
          r.address,
          r.category,
          r.lat,
          r.lng,
          s.summary,
          s.pros_json,
          s.cons_json,
          s.recommended_for_json,
          s.atmosphere,
          s.value_for_money,
          s.revisit_intent,
          GROUP_CONCAT(DISTINCT k.keyword) AS keywords
        FROM restaurants r
        LEFT JOIN restaurant_ai_summaries s ON s.restaurant_id = r.id
        LEFT JOIN restaurant_keywords rk ON rk.restaurant_id = r.id
        LEFT JOIN keywords k ON k.id = rk.keyword_id
        GROUP BY r.id
        ORDER BY r.id DESC
      `
    )
    .all();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address,
    category: row.category,
    lat: row.lat,
    lng: row.lng,
    agent1Profile: {
      summary: row.summary ?? "",
      pros: parseJsonArray(row.pros_json),
      cons: parseJsonArray(row.cons_json),
      recommendedFor: parseJsonArray(row.recommended_for_json),
      atmosphere: row.atmosphere ?? "",
      valueForMoney: row.value_for_money ?? "",
      revisitIntent: row.revisit_intent ?? "",
      keywords: row.keywords ? row.keywords.split(",").filter(Boolean) : []
    }
  }));
};

const userStateRules = [
  {
    field: "temperaturePreference",
    value: "warm",
    label: "따뜻한 음식",
    terms: ["따뜻", "뜨끈", "국물", "찌개", "탕", "추워", "비"]
  },
  {
    field: "foodStyle",
    value: "hearty",
    label: "든든한 식사",
    terms: ["든든", "배고", "밥", "식사", "한끼", "많이"]
  },
  {
    field: "foodStyle",
    value: "light",
    label: "가벼운 식사",
    terms: ["가볍", "간단", "빨리", "빠른", "부담", "혼밥"]
  },
  {
    field: "atmospherePreference",
    value: "quiet",
    label: "조용한 분위기",
    terms: ["조용", "차분", "공부", "작업", "대화"]
  },
  {
    field: "foodStyle",
    value: "cafe",
    label: "카페/디저트",
    terms: ["커피", "카페", "디저트", "기분전환", "기분 전환"]
  },
  {
    field: "foodStyle",
    value: "bold",
    label: "자극적이거나 맛이 강한 메뉴",
    terms: ["매운", "자극", "스트레스", "치킨", "고기", "맛있는"]
  },
  {
    field: "avoid",
    value: "noisy",
    label: "시끄러운 곳 피하기",
    terms: ["시끄러운 곳은 싫", "시끄럽지", "조용한 곳", "너무 붐비"]
  }
];

const analyzeUserState = (prompt) => {
  const normalized = prompt.toLowerCase();
  const state = {
    mood: normalized.includes("우울") || normalized.includes("지치") ? "지침/위로 필요" : "명확하지 않음",
    hungerLevel:
      normalized.includes("배고") || normalized.includes("든든") || normalized.includes("많이")
        ? "높음"
        : "보통",
    temperaturePreference: "상관없음",
    foodStyle: [],
    atmospherePreference: [],
    avoid: [],
    priority: []
  };

  userStateRules.forEach((rule) => {
    if (!rule.terms.some((term) => normalized.includes(term))) return;
    if (rule.field === "temperaturePreference") {
      state.temperaturePreference = rule.label;
    } else if (!state[rule.field].includes(rule.label)) {
      state[rule.field].push(rule.label);
    }
    if (!state.priority.includes(rule.label)) state.priority.push(rule.label);
  });

  if (state.priority.length === 0) state.priority.push("AI 종합 리뷰와 전반적으로 잘 맞는 곳");
  return state;
};

const profileText = (candidate) =>
  [
    candidate.name,
    candidate.category,
    candidate.agent1Profile.summary,
    candidate.agent1Profile.atmosphere,
    candidate.agent1Profile.valueForMoney,
    candidate.agent1Profile.revisitIntent,
    ...candidate.agent1Profile.pros,
    ...candidate.agent1Profile.cons,
    ...candidate.agent1Profile.recommendedFor,
    ...candidate.agent1Profile.keywords
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const fitRules = [
  {
    label: "따뜻한 음식",
    queryTerms: ["따뜻", "뜨끈", "국물", "찌개", "탕"],
    profileTerms: ["따뜻", "뜨끈", "국물", "찌개", "탕", "한식", "식당", "학식", "든든"]
  },
  {
    label: "든든한 식사",
    queryTerms: ["든든", "배고", "밥", "식사", "한끼"],
    profileTerms: ["든든", "식사", "한끼", "밥", "학식", "식당", "가성비"]
  },
  {
    label: "가벼운 식사",
    queryTerms: ["가볍", "간단", "빨리", "빠른", "혼밥"],
    profileTerms: ["가볍", "간단", "빠른", "혼밥", "점심", "접근성"]
  },
  {
    label: "조용한 분위기",
    queryTerms: ["조용", "차분", "공부", "작업", "대화"],
    profileTerms: ["조용", "차분", "공부", "작업", "대화", "카페"]
  },
  {
    label: "카페/디저트",
    queryTerms: ["커피", "카페", "디저트", "기분전환", "기분 전환"],
    profileTerms: ["커피", "카페", "디저트", "기분", "데이트"]
  },
  {
    label: "맛이 강한 메뉴",
    queryTerms: ["매운", "자극", "스트레스", "치킨", "고기"],
    profileTerms: ["매운", "자극", "치킨", "고기", "소스", "맥주", "야식"]
  }
];

const scoreCandidate = (prompt, candidate) => {
  const normalizedPrompt = prompt.toLowerCase();
  const text = profileText(candidate);
  let fitScore = candidate.agent1Profile.summary ? 20 : 5;
  const matchedFactors = [];
  const mismatchFactors = [];

  fitRules.forEach((rule) => {
    const userHit = rule.queryTerms.some((term) => normalizedPrompt.includes(term));
    if (!userHit) return;

    const hits = rule.profileTerms.filter((term) => text.includes(term));
    if (hits.length > 0) {
      fitScore += 18 + hits.length * 4;
      matchedFactors.push(rule.label, ...hits.slice(0, 2));
    } else {
      mismatchFactors.push(`${rule.label} 근거 부족`);
      fitScore -= 4;
    }
  });

  if (
    (normalizedPrompt.includes("따뜻") || normalizedPrompt.includes("국물")) &&
    (text.includes("국물") || text.includes("국밥") || text.includes("따뜻"))
  ) {
    fitScore += 18;
    matchedFactors.push("따뜻한 국물");
  }

  if (normalizedPrompt.includes("든든") && text.includes("가볍게")) {
    fitScore -= 8;
    mismatchFactors.push("든든함보다는 가벼운 식사 성향");
  }

  if (text.includes("가성비") || text.includes("저렴")) fitScore += 4;
  if (text.includes("재방문") || text.includes("좋음")) fitScore += 3;
  if (normalizedPrompt.includes("시끄") && text.includes("붐비")) fitScore -= 16;

  return {
    ...candidate,
    fitScore: Math.max(0, Math.min(100, fitScore)),
    matchedFactors: Array.from(new Set(matchedFactors)).slice(0, 6),
    mismatchFactors: Array.from(new Set(mismatchFactors)).slice(0, 3)
  };
};

const fallbackRecommend = ({ prompt, candidates }) => {
  const userState = analyzeUserState(prompt);
  const recommendations = candidates
    .map((candidate) => scoreCandidate(prompt, candidate))
    .sort((a, b) => b.fitScore - a.fitScore || a.id - b.id)
    .slice(0, 3)
    .map((candidate, index) => ({
      rank: index + 1,
      restaurantId: candidate.id,
      fitScore: candidate.fitScore,
      matchedFactors: candidate.matchedFactors,
      mismatchFactors: candidate.mismatchFactors,
      reason:
        candidate.matchedFactors.length > 0
          ? `Agent 1 종합 리뷰에서 ${candidate.matchedFactors.slice(0, 3).join(", ")} 요소가 현재 상태와 잘 맞습니다.`
          : "Agent 1 종합 리뷰 정보가 전반적으로 안정적이라 후보로 추천했습니다.",
      caution:
        candidate.mismatchFactors.length > 0
          ? candidate.mismatchFactors.join(", ")
          : "특별한 주의 요소는 발견되지 않았습니다."
    }));

  return { userState, recommendations };
};

const attachRestaurantInfo = (agentResult, candidates, source) => {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const recommendations = (agentResult.recommendations ?? [])
    .map((item, index) => {
      const restaurantId = Number(item.restaurantId ?? item.id);
      const candidate = byId.get(restaurantId);
      if (!candidate) return null;
      return {
        rank: Number(item.rank) || index + 1,
        id: candidate.id,
        name: candidate.name,
        address: candidate.address,
        category: candidate.category,
        lat: candidate.lat,
        lng: candidate.lng,
        fitScore: Number(item.fitScore) || 0,
        matchedFactors: Array.isArray(item.matchedFactors) ? item.matchedFactors : [],
        mismatchFactors: Array.isArray(item.mismatchFactors) ? item.mismatchFactors : [],
        reason: item.reason || "AI 종합 리뷰와 사용자 상태를 비교해 추천했습니다.",
        caution: item.caution || "",
        summary: candidate.agent1Profile.summary,
        agent1Profile: candidate.agent1Profile
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 3);

  return {
    source,
    userState: agentResult.userState ?? {},
    recommendations
  };
};

const recommend = async (prompt) => {
  const candidates = listAgentProfiles();
  let agentResult = null;
  let source = "local-agent";

  try {
    agentResult = await llmService.requestRecommendation({ userPrompt: prompt, candidates });
    if (agentResult) source = "coderama";
  } catch {
    agentResult = null;
  }

  if (!agentResult) {
    agentResult = fallbackRecommend({ prompt, candidates });
  }

  return attachRestaurantInfo(agentResult, candidates, source);
};

const create = ({ name, address, category = null, lat = null, lng = null }) => {
  const stmt = db.prepare(
    "INSERT INTO restaurants (name, address, category, lat, lng) VALUES (?, ?, ?, ?, ?) RETURNING id, name, address, category, lat, lng, created_at, updated_at"
  );
  return stmt.get(name, address, category, lat, lng);
};

const update = (id, { name, address, category, lat, lng }) => {
  const current = db
    .prepare("SELECT id, name, address, category, lat, lng FROM restaurants WHERE id = ?")
    .get(id);
  if (!current) return null;

  const next = {
    name: name ?? current.name,
    address: address ?? current.address,
    category: category ?? current.category,
    lat: lat ?? current.lat,
    lng: lng ?? current.lng
  };

  db.prepare(
    "UPDATE restaurants SET name = ?, address = ?, category = ?, lat = ?, lng = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(next.name, next.address, next.category, next.lat, next.lng, id);

  return db
    .prepare(
      "SELECT id, name, address, category, lat, lng, created_at, updated_at FROM restaurants WHERE id = ?"
    )
    .get(id);
};

module.exports = { list, create, update, recommend };
