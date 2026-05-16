const express = require("express");
const restaurantController = require("../controllers/restaurant.controller");

const router = express.Router();

router.get("/", restaurantController.list);
router.post("/", restaurantController.create);
router.put("/:id", restaurantController.update);

module.exports = router;

