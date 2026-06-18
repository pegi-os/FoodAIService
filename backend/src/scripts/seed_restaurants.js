const { db } = require("../db/sqlite");

const seedRestaurants = [
  {
    id: 1,
    name: "성대 자연과학캠퍼스 학식",
    address: "경기 수원시 장안구 서부로 2066 성균관대학교 자연과학캠퍼스",
    category: "학식",
    lat: 37.293889,
    lng: 126.974444,
    agent1: {
      summary:
        "빠르고 저렴하게 든든한 한 끼를 해결하기 좋은 곳입니다. 특별한 분위기보다는 실용적인 식사에 강점이 있고, 수업 전후 혼밥이나 점심 식사에 잘 맞습니다.",
      pros: ["빠른 식사 가능", "가성비가 좋음", "든든한 한 끼에 적합"],
      cons: ["분위기는 평범함", "메뉴 선택 폭이 날마다 다를 수 있음"],
      keywords: ["학식", "가성비", "혼밥", "점심", "든든함", "빠른 식사"],
      recommendedFor: ["혼밥", "점심", "든든한 식사", "시간이 없을 때"],
      atmosphere: "캐주얼하고 실용적인 분위기",
      valueForMoney: "좋음",
      revisitIntent: "보통 이상"
    }
  },
  {
    id: 2,
    name: "율전동 조용한 카페",
    address: "경기 수원시 장안구 율전동",
    category: "카페",
    lat: 37.2972,
    lng: 126.9712,
    agent1: {
      summary:
        "조용한 분위기에서 커피와 디저트를 즐기기 좋은 카페입니다. 좌석이 비교적 넉넉하고 대화, 공부, 작업처럼 머무르는 목적에 잘 맞습니다.",
      pros: ["조용한 분위기", "커피와 디저트가 무난함", "작업하기 좋은 좌석"],
      cons: ["든든한 식사 메뉴는 부족함", "식사 목적보다는 휴식 목적에 가까움"],
      keywords: ["카페", "커피", "디저트", "조용함", "공부", "작업", "기분 전환"],
      recommendedFor: ["공부", "작업", "데이트", "기분 전환", "가벼운 대화"],
      atmosphere: "조용하고 차분함",
      valueForMoney: "보통",
      revisitIntent: "높음"
    }
  },
  {
    id: 3,
    name: "수원역 빠른 한끼",
    address: "경기 수원시 팔달구 매산로1가 수원역",
    category: "식당",
    lat: 37.2663,
    lng: 127.0,
    agent1: {
      summary:
        "접근성이 좋고 가볍게 한 끼 먹기 좋은 식당입니다. 오래 머무르기보다는 빠르게 식사하고 이동해야 할 때 적합합니다.",
      pros: ["접근성이 좋음", "빠른 식사 가능", "혼밥에 부담이 적음"],
      cons: ["특별한 분위기는 약함", "붐비는 시간대가 있을 수 있음"],
      keywords: ["식당", "빠른 식사", "혼밥", "접근성", "점심", "가벼운 식사"],
      recommendedFor: ["혼밥", "빠른 식사", "이동 전 식사", "가벼운 점심"],
      atmosphere: "캐주얼하고 회전이 빠름",
      valueForMoney: "좋음",
      revisitIntent: "보통"
    }
  },
  {
    id: 4,
    name: "인계동 따뜻한 국밥",
    address: "경기 수원시 팔달구 인계동",
    category: "한식",
    lat: 37.2655,
    lng: 127.032,
    agent1: {
      summary:
        "따뜻한 국물과 든든한 식사를 원하는 사람에게 잘 맞는 한식집입니다. 지치거나 추운 날, 위로가 되는 식사를 찾을 때 추천하기 좋습니다.",
      pros: ["따뜻한 국물 메뉴", "든든한 식사", "혼밥도 가능"],
      cons: ["가벼운 식사로는 조금 무거울 수 있음", "카페처럼 오래 머무르는 분위기는 아님"],
      keywords: ["한식", "국물", "국밥", "따뜻함", "든든함", "혼밥", "위로"],
      recommendedFor: ["추운 날", "지친 날", "든든한 식사", "따뜻한 음식"],
      atmosphere: "편안하고 캐주얼함",
      valueForMoney: "좋음",
      revisitIntent: "높음"
    }
  },
  {
    id: 5,
    name: "매탄동 매콤 치킨",
    address: "경기 수원시 영통구 매탄동",
    category: "치킨",
    lat: 37.267,
    lng: 127.043,
    agent1: {
      summary:
        "매콤하고 자극적인 맛으로 스트레스 해소나 야식에 잘 맞는 치킨집입니다. 든든함보다는 맛의 강도와 기분 전환에 강점이 있습니다.",
      pros: ["매콤한 소스", "야식에 적합", "맥주 안주로 좋음"],
      cons: ["조용한 분위기는 아님", "가벼운 식사를 원할 때는 부담스러울 수 있음"],
      keywords: ["치킨", "매운맛", "자극적", "야식", "맥주", "스트레스"],
      recommendedFor: ["야식", "스트레스 해소", "매운 음식", "친구와 식사"],
      atmosphere: "활기차고 캐주얼함",
      valueForMoney: "보통",
      revisitIntent: "보통 이상"
    }
  }
];

const getOrCreateKeywordId = (keyword) => {
  db.prepare("INSERT OR IGNORE INTO keywords (keyword) VALUES (?)").run(keyword);
  return db.prepare("SELECT id FROM keywords WHERE keyword = ?").get(keyword)?.id ?? null;
};

const upsertAiSummary = (restaurantId, payload) => {
  db.prepare(
    `
      INSERT INTO restaurant_ai_summaries (
        restaurant_id, summary, pros_json, cons_json, recommended_for_json,
        atmosphere, value_for_money, revisit_intent, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(restaurant_id) DO UPDATE SET
        summary = excluded.summary,
        pros_json = excluded.pros_json,
        cons_json = excluded.cons_json,
        recommended_for_json = excluded.recommended_for_json,
        atmosphere = excluded.atmosphere,
        value_for_money = excluded.value_for_money,
        revisit_intent = excluded.revisit_intent,
        updated_at = datetime('now')
    `
  ).run(
    restaurantId,
    payload.summary,
    JSON.stringify(payload.pros),
    JSON.stringify(payload.cons),
    JSON.stringify(payload.recommendedFor),
    payload.atmosphere,
    payload.valueForMoney,
    payload.revisitIntent
  );
};

const ensureRestaurantKeywords = (restaurantId, keywords) => {
  db.prepare("DELETE FROM restaurant_keywords WHERE restaurant_id = ?").run(restaurantId);
  const insert = db.prepare(
    "INSERT OR IGNORE INTO restaurant_keywords (restaurant_id, keyword_id) VALUES (?, ?)"
  );

  keywords.forEach((keyword) => {
    const keywordId = getOrCreateKeywordId(keyword);
    if (keywordId) insert.run(restaurantId, keywordId);
  });
};

const ensureFeaturedReview = (restaurantId, restaurant) => {
  db.prepare("DELETE FROM reviews WHERE restaurant_id = ? AND is_featured = 1").run(restaurantId);
  db.prepare(
    "INSERT INTO reviews (restaurant_id, source, content, is_featured, written_at) VALUES (?, ?, ?, 1, ?)"
  ).run(
    restaurantId,
    "Agent 1 dummy profile",
    `${restaurant.agent1.summary} 추천 상황: ${restaurant.agent1.recommendedFor.join(", ")}`,
    "dummy"
  );
};

const main = () => {
  const upsertRestaurant = db.prepare(`
    INSERT INTO restaurants (id, name, address, category, lat, lng)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      address = excluded.address,
      category = excluded.category,
      lat = excluded.lat,
      lng = excluded.lng,
      updated_at = datetime('now')
  `);

  db.exec("BEGIN");
  try {
    seedRestaurants.forEach((restaurant) => {
      upsertRestaurant.run(
        restaurant.id,
        restaurant.name,
        restaurant.address,
        restaurant.category,
        restaurant.lat,
        restaurant.lng
      );
      upsertAiSummary(restaurant.id, restaurant.agent1);
      ensureRestaurantKeywords(restaurant.id, restaurant.agent1.keywords);
      ensureFeaturedReview(restaurant.id, restaurant);
    });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const countRow = db.prepare("SELECT COUNT(*) AS count FROM restaurants").get();
  console.log(`[seed] restaurants count: ${countRow.count}`);
  console.log("[seed] dummy Agent 1 summaries are ready");
};

main();
