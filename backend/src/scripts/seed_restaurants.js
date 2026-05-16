const { db } = require("../db/sqlite");

// 간단 더미 데이터(필요하면 lat/lng 수정)
const seedRestaurants = [
  {
    name: "성대 자연과학캠퍼스 학식",
    address: "경기 수원시 장안구 서부로 2066 성균관대학교 자연과학캠퍼스",
    category: "학식",
    lat: 37.293889,
    lng: 126.974444
  },
  {
    name: "율전동 카페(더미)",
    address: "경기 수원시 장안구 율전동",
    category: "카페",
    lat: 37.2972,
    lng: 126.9712
  },
  {
    name: "수원역 맛집(더미)",
    address: "경기 수원시 팔달구 매산로1가 수원역",
    category: "식당",
    lat: 37.2663,
    lng: 127.0000
  }
];

const seedAiSummariesByName = {
  "성대 자연과학캠퍼스 학식": {
    summary:
      "인계동 치킨 연구소는 바삭한 튀김과 다양한 소스 조합에서 좋은 평가를 받습니다. 특히 야식이나 맥주 안주로 주문하는 고객이 많습니다.",
    pros: ["튀김이 바삭해요", "소스 조합이 다양해요", "야식으로 만족도가 높아요"],
    cons: ["배달 시간이 늦는 경우가 있어요", "식으면 만족도가 떨어질 수 있어요"],
    keywords: ["치킨", "바삭함", "소스", "배달", "야식", "맥주안주"],
    featuredReview: "소스가 맛있고 치킨이 바삭했어요. 다음에도 주문할 것 같아요.",
    source: "카카오맵 리뷰",
    writtenAt: "6일 전",
    recommendedFor: ["야식", "배달", "맥주 안주"],
    atmosphere: "캐주얼한",
    valueForMoney: "좋음",
    revisitIntent: "보통 이상 (73%)"
  },
  "율전동 카페(더미)": {
    summary: "조용한 분위기에서 커피와 디저트를 즐기기 좋아요. 좌석이 넉넉한 편입니다.",
    pros: ["커피가 깔끔해요", "좌석이 편해요"],
    cons: ["주말엔 사람이 많아요"],
    keywords: ["카페", "커피", "디저트", "조용함"],
    featuredReview: "커피 맛이 무난하고 자리 많아서 작업하기 좋았어요.",
    source: "네이버 리뷰",
    writtenAt: "2주 전",
    recommendedFor: ["공부", "데이트"],
    atmosphere: "조용한",
    valueForMoney: "보통",
    revisitIntent: "높음"
  },
  "수원역 맛집(더미)": {
    summary: "가볍게 한 끼 먹기 좋은 메뉴 구성이고 접근성이 좋아요.",
    pros: ["역이랑 가까워요"],
    cons: ["피크 시간엔 웨이팅이 있어요"],
    keywords: ["역근처", "한끼", "웨이팅"],
    featuredReview: "수원역 근처라 이동하다가 들르기 편했어요.",
    source: "카카오맵 리뷰",
    writtenAt: "1달 전",
    recommendedFor: ["혼밥", "빠른 식사"],
    atmosphere: "캐주얼한",
    valueForMoney: "좋음",
    revisitIntent: "보통"
  }
};

const getOrCreateKeywordId = (keyword) => {
  db.prepare("INSERT OR IGNORE INTO keywords (keyword) VALUES (?)").run(keyword);
  const row = db.prepare("SELECT id FROM keywords WHERE keyword = ?").get(keyword);
  return row?.id ?? null;
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
    payload.summary ?? null,
    JSON.stringify(payload.pros ?? []),
    JSON.stringify(payload.cons ?? []),
    JSON.stringify(payload.recommendedFor ?? []),
    payload.atmosphere ?? null,
    payload.valueForMoney ?? null,
    payload.revisitIntent ?? null
  );
};

const ensureRestaurantKeywords = (restaurantId, keywords) => {
  const insert = db.prepare(
    "INSERT OR IGNORE INTO restaurant_keywords (restaurant_id, keyword_id) VALUES (?, ?)"
  );
  keywords.forEach((kw) => {
    const keywordId = getOrCreateKeywordId(kw);
    if (!keywordId) return;
    insert.run(restaurantId, keywordId);
  });
};

const ensureFeaturedReview = (restaurantId, { content, source, writtenAt }) => {
  const exists = db
    .prepare(
      "SELECT id FROM reviews WHERE restaurant_id = ? AND is_featured = 1 LIMIT 1"
    )
    .get(restaurantId);
  if (exists) return;

  db.prepare(
    "INSERT INTO reviews (restaurant_id, source, content, is_featured, written_at) VALUES (?, ?, ?, 1, ?)"
  ).run(restaurantId, source ?? null, content, writtenAt ?? null);
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
    // id를 고정해서(1~3) 매번 동일하게 테스트 가능하게 유지
    seedRestaurants.forEach((r, idx) => {
      upsertRestaurant.run(
        idx + 1,
        r.name,
        r.address,
        r.category ?? null,
        r.lat ?? null,
        r.lng ?? null
      );
    });

    // restaurants id 조회
    const rows = db
      .prepare("SELECT id, name FROM restaurants WHERE name IN (?, ?, ?)")
      .all(seedRestaurants[0].name, seedRestaurants[1].name, seedRestaurants[2].name);
    const idByName = new Map(rows.map((r) => [r.name, r.id]));

    // AI 요약/키워드/대표리뷰 시드
    Object.entries(seedAiSummariesByName).forEach(([name, payload]) => {
      const restaurantId = idByName.get(name);
      if (!restaurantId) return;

      upsertAiSummary(restaurantId, payload);
      ensureRestaurantKeywords(restaurantId, payload.keywords ?? []);
      ensureFeaturedReview(restaurantId, {
        content: payload.featuredReview,
        source: payload.source,
        writtenAt: payload.writtenAt
      });
    });

    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }

  const countRow = db.prepare("SELECT COUNT(*) AS count FROM restaurants").get();
  // eslint-disable-next-line no-console
  console.log(`[seed] restaurants count: ${countRow.count}`);
};

main();
