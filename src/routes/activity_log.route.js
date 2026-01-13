const express = require("express");
const {
  ActivityLogController,
} = require("../controllers/activity_log.controller");
const { authMiddleware } = require("../middlewares/middleware");
const router = express.Router();

router.post("/create", ActivityLogController.logActivity);
router.get("/", authMiddleware, ActivityLogController.getActivities);

module.exports = router;
