const { syncDataMisa } = require("../controllers/misa.controller");
const MisaConfig = require("../models/misa_config.model");

async function misaSeed() {
  const config = await MisaConfig.findByPk(1);
  if (!config || !config.accessToken) {
    console.error("Misa access token not found");
  }

  console.log("=== BẮT ĐẦU KHỞI TẠO DỮ LIỆU MISA ===");

  await Promise.all([
    syncDataMisa(config.accessToken, 2),
    syncDataMisa(config.accessToken, 3),
  ]);

  console.log("=== KẾT THÚC KHỞI TẠO DỮ LIỆU MISA ===");
}

module.exports = misaSeed;
