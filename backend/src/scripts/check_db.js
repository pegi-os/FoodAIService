const { db, dbFilePath } = require("../db/sqlite");

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
  .all()
  .map((r) => r.name);

const aiCount = db.prepare("SELECT COUNT(1) AS c FROM restaurant_ai_summaries").get().c;
const keywordsCount = db.prepare("SELECT COUNT(1) AS c FROM keywords").get().c;
const restaurantKeywordsCount = db.prepare("SELECT COUNT(1) AS c FROM restaurant_keywords").get().c;
const featuredReviewsCount = db.prepare("SELECT COUNT(1) AS c FROM reviews WHERE is_featured = 1").get().c;

// eslint-disable-next-line no-console
console.log({
  dbFilePath,
  tables,
  aiCount,
  keywordsCount,
  restaurantKeywordsCount,
  featuredReviewsCount
});

