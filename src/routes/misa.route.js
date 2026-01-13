const express = require("express");
const router = express.Router();
const { MisaController } = require("../controllers/misa.controller");
const { authMiddleware } = require("../middlewares/middleware");

router.get("/stock", authMiddleware, MisaController.getMisaStock);
router.get("/customer", authMiddleware, MisaController.getMisaAccount);
router.get("/config", authMiddleware, MisaController.getMisaConfig);
router.get("/data_count", authMiddleware, MisaController.countMisaData);
router.post("/connect", authMiddleware, MisaController.connectToMisa);
router.post("/sync_dictionary", authMiddleware, MisaController.syncMisa);
router.post("/sync_dictionary/all", authMiddleware, MisaController.syncAllMisa);
router.post("/post_order_misa", authMiddleware, MisaController.buildOrderMisa);
module.exports = router;
