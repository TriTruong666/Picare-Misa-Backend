const express = require("express");
const router = express.Router();
const { MisaController } = require("../controllers/misa.controller");
const { authorizeRoles, authMiddleware } = require("../middlewares/middleware");

router.post("/connect", MisaController.connectToMisa);
router.post("/sync_dictionary", MisaController.syncMisa);
router.post("/sync_dictionary/all", MisaController.syncAllMisa);

module.exports = router;
