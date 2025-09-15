const express = require("express");
const OrderController = require("../controllers/order.controller");
const router = express.Router();

router.get("/", OrderController.getOrders);
router.get("/:orderId", OrderController.getDetailOrder);
router.get("/count", OrderController.countOrders);
router.get("/query", OrderController.searchOrders);
router.post("/sync", OrderController.syncHaravanOrders);
router.put("/:orderId/status", OrderController.changeOrderStatus);

module.exports = router;
