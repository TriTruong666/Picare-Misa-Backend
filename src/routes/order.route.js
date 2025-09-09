const express = require("express");
const OrderController = require("../controllers/order.controller");
const router = express.Router();

router.get("/", OrderController.getOrders);
router.post("/sync", OrderController.syncHaravanOrders);
router.get("/count", OrderController.countOrders);
router.put("/:orderId/status", OrderController.changeOrderStatus);

module.exports = router;
