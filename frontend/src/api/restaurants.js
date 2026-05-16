const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export async function getRestaurants() {
  const res = await fetch(`${API_BASE_URL}/api/restaurants`);
  if (!res.ok) throw new Error(`GET /api/restaurants failed (${res.status})`);
  const json = await res.json();
  return json.data;
}

export async function createRestaurant(payload) {
  const res = await fetch(`${API_BASE_URL}/api/restaurants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`POST /api/restaurants failed (${res.status})`);
  const json = await res.json();
  return json.data;
}

