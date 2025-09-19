const express = require("express");
const { AnalyticsController } = require("../controllers/analytics.controller");
const { authMiddleware } = require("../middlewares/middleware");
const router = express.Router();

router.get("/", authMiddleware, AnalyticsController.countAllOrder);

module.exports = router;
