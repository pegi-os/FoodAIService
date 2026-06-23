const { db } = require("../db/sqlite");

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const list = () => {
  const restaurants = db
    .prepare(
      `
      SELECT
        r.id,
        r.name,
        r.address,
        r.category,
        r.lat,
        r.lng,
        r.created_at,
        r.updated_at,
        s.summary AS ai_summary,
        s.pros_json,
        s.cons_json,
        s.recommended_for_json,
        s.atmosphere,
        s.value_for_money,
        s.revisit_intent,
        COUNT(rv.id) AS review_count
      FROM restaurants r
      LEFT JOIN restaurant_ai_summaries s ON s.restaurant_id = r.id
      LEFT JOIN reviews rv ON rv.restaurant_id = r.id
      GROUP BY r.id
      ORDER BY r.id DESC
      `
    )
    .all();

  const reviewStmt = db.prepare(
    `
    SELECT source, content, written_at
    FROM reviews
    WHERE restaurant_id = ?
    ORDER BY written_at DESC, id DESC
    LIMIT 3
    `
  );

  return restaurants.map((restaurant) => {
    const pros = parseJson(restaurant.pros_json, {});
    const cons = parseJson(restaurant.cons_json, {});
    const recommendedFor = parseJson(restaurant.recommended_for_json, {});
    const reviews = reviewStmt.all(restaurant.id);

    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      category: restaurant.category,
      lat: restaurant.lat,
      lng: restaurant.lng,
      created_at: restaurant.created_at,
      updated_at: restaurant.updated_at,
      aiSummary: restaurant.ai_summary,
      pros,
      cons,
      recommendedFor,
      atmosphere: restaurant.atmosphere,
      valueForMoney: restaurant.value_for_money,
      revisitIntent: restaurant.revisit_intent,
      reviewCount: restaurant.review_count,
      reviews
    };
  });
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

module.exports = { list, create, update };
