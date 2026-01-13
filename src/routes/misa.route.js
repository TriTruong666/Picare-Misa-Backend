const express = require("express");
const router = express.Router();
const { MisaController } = require("../controllers/misa.controller");

router.get("/stock", MisaController.getMisaStock);
router.get("/customer", MisaController.getMisaAccount);
router.get("/config", MisaController.getMisaConfig);
router.get("/data_count", MisaController.countMisaData);
router.post("/connect", MisaController.connectToMisa);
router.post("/sync_dictionary", MisaController.syncMisa);
router.post("/sync_dictionary/all", MisaController.syncAllMisa);
router.post("/post_order_misa", MisaController.buildOrderMisa);
module.exports = router;
