const cron = require("node-cron");
const { sendSse } = require("../config/sse");
const { runSyncHaravanOrders } = require("../controllers/order.controller");
const {
  initialMisaConnection,
  syncDataMisa,
} = require("../controllers/misa.controller");
const MisaConfig = require("../models/misa_config.model");

async function runMisaCron() {
  try {
    await initialMisaConnection();
    console.log("Đã kết nối MISA");

    const config = await MisaConfig.findByPk(1);
    if (!config || !config.accessToken) {
      throw new Error("Không tìm thấy accessToken trong DB");
    }
    const accessToken = config.accessToken;

    // B3: Sync lần lượt 3 loại dữ liệu
    const [cus, product, stock] = await Promise.all([
      syncDataMisa(accessToken, 1),
      syncDataMisa(accessToken, 2),
      syncDataMisa(accessToken, 3),
    ]);

    console.log("Đồng bộ thành công:", {
      customers: cus.total,
      products: product.total,
      stocks: stock.total,
    });
  } catch (err) {
    console.error(" Cron MISA Error:", err.message);
  }
}
cron.schedule("0,20,40 * * * *", runMisaCron);

cron.schedule("29,59 * * * *", () => {
  sendSse({
    status: "warning",
    message: "Hệ thống sẽ đồng bộ đơn Haravan trong vòng 1 phút nữa",
    type: "notification",
  });
  console.log("Prepare Sync Haravan...");
});

// Job đồng bộ chính, chạy mỗi 30 phút
cron.schedule("0,30 * * * *", async () => {
  try {
    sendSse({
      status: "running",
      message: "Quá trình đồng bộ đơn Haravan bắt đầu...",
      type: "alert",
      isBlocked: true,
    });

    const result = await runSyncHaravanOrders();
    sendSse({
      status: "success",
      message: `Đồng bộ xong ${result.synced} orders`,
      type: "alert",
      isBlocked: false,
    });
  } catch (err) {
    sendSse({ status: "error", message: ` Lỗi: ${err.message}` });
  }
});

cron.schedule("*/30 * * * * *", () => {
  sendSse({
    status: "health",
    message: "Server Online",
  });
});
