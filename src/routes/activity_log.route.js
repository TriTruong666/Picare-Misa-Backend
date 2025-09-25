const express = require("express");
const {
  ActivityLogController,
} = require("../controllers/activity_log.controller");
const router = express.Router();

router.post("/create", ActivityLogController.logActivity);
router.get("/", ActivityLogController.getActivities);

module.exports = router;
