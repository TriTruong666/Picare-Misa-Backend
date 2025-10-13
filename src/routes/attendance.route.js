const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middlewares/middleware");
const {
  AttendanceController,
} = require("../controllers/attendance.controller");

router.get("/employee", AttendanceController.getAttendanceEmployeeData);
router.get(
  "/by-server/",
  AttendanceController.getAttendanceEmployeeDataByServer
);
router.get("/server", AttendanceController.getAllAttendanceServer);
router.post("/sync", AttendanceController.syncAttendanceData);
router.post("/server", AttendanceController.createAttendanceServer);
module.exports = router;
