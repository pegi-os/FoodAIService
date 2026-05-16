const restaurantService = require("../services/restaurant.service");

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

exports.list = (req, res) => {
  const rows = restaurantService.list();
  res.json({ data: rows });
};

exports.create = (req, res) => {
  const { name, address, category, lat, lng } = req.body ?? {};

  if (!name || typeof name !== "string") return res.status(400).json({ error: "INVALID_NAME" });
  if (!address || typeof address !== "string")
    return res.status(400).json({ error: "INVALID_ADDRESS" });
  if (category != null && typeof category !== "string")
    return res.status(400).json({ error: "INVALID_CATEGORY" });

  if (lat != null && !isFiniteNumber(lat)) return res.status(400).json({ error: "INVALID_LAT" });
  if (lng != null && !isFiniteNumber(lng)) return res.status(400).json({ error: "INVALID_LNG" });

  const row = restaurantService.create({
    name,
    address,
    category: category ?? null,
    lat: lat ?? null,
    lng: lng ?? null
  });
  res.status(201).json({ data: row });
};

exports.update = (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "INVALID_ID" });

  const { name, address, lat, lng } = req.body ?? {};
  const { category } = req.body ?? {};

  if (name != null && typeof name !== "string") return res.status(400).json({ error: "INVALID_NAME" });
  if (address != null && typeof address !== "string")
    return res.status(400).json({ error: "INVALID_ADDRESS" });
  if (category != null && typeof category !== "string")
    return res.status(400).json({ error: "INVALID_CATEGORY" });
  if (lat != null && !isFiniteNumber(lat)) return res.status(400).json({ error: "INVALID_LAT" });
  if (lng != null && !isFiniteNumber(lng)) return res.status(400).json({ error: "INVALID_LNG" });

  const row = restaurantService.update(id, { name, address, category, lat, lng });
  if (!row) return res.status(404).json({ error: "NOT_FOUND" });
  res.json({ data: row });
};
