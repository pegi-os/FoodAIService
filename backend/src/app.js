const express = require("express");

const userRoutes = require("./routes/user.routes");
const restaurantRoutes = require("./routes/restaurant.routes");

const app = express();

app.use(express.json());

// Minimal CORS (dev-friendly)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/users", userRoutes);
app.use("/api/restaurants", restaurantRoutes);

module.exports = app;
