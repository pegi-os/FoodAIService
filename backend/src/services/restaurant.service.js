const { db } = require("../db/sqlite");

const list = () => {
  const stmt = db.prepare(
    "SELECT id, name, address, category, lat, lng, created_at, updated_at FROM restaurants ORDER BY id DESC"
  );
  return stmt.all();
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
