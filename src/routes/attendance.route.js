const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/middleware");
const {
  AttendanceController,
} = require("../controllers/attendance.controller");

router.get(
  "/employee",
  authMiddleware,
  AttendanceController.getAttendanceEmployeeData
);
router.get(
  "/by-server/",
  authMiddleware,
  AttendanceController.getAttendanceEmployeeDataByServer
);
router.get(
  "/server",
  authMiddleware,
  AttendanceController.getAllAttendanceServer
);
router.post("/sync", authMiddleware, AttendanceController.syncAttendanceData);
router.post(
  "/sync-google-sheet",
  authMiddleware,
  AttendanceController.syncGoogleSheet
);
router.post(
  "/server",
  authMiddleware,
  AttendanceController.createAttendanceServer
);
module.exports = router;
