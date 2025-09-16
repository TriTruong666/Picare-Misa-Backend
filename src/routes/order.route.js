const express = require("express");
const { OrderController } = require("../controllers/order.controller");
const { authorizeRoles, authMiddleware } = require("../middlewares/middleware");
const router = express.Router();

router.get("/", authMiddleware, OrderController.getOrders);
router.get("/:orderId", authMiddleware, OrderController.getDetailOrder);
router.get("/count", authMiddleware, OrderController.countOrders);
router.get(
  "/query",
  authMiddleware,
  authorizeRoles("admin"),
  OrderController.searchOrders
);
router.post(
  "/sync",
  authMiddleware,
  authorizeRoles("admin"),
  OrderController.syncHaravanOrders
);
router.put(
  "/:orderId/status",
  authMiddleware,
  OrderController.changeOrderStatus
);

router.put(
  "/scan",
  authMiddleware,
  authorizeRoles("admin", "staff"),
  OrderController.scanOrder
);
module.exports = router;
