const cron = require("node-cron");
const { sendSse } = require("../config/sse");
const { runSyncHaravanOrders } = require("../controllers/order.controller");

cron.schedule("29,59 * * * *", () => {
  sendSse({
    status: "warning",
    message: "Hệ thống sẽ đồng bộ đơn Haravan trong vòng 1 phút nữa",
    type: "notification",
  });
  console.log("Prepare Sync...");
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
    sendSse({ status: "error", message: `❌ Lỗi: ${err.message}` });
  }
});

cron.schedule("*/30 * * * * *", () => {
  sendSse({
    status: "health",
    message: "Server Online",
  });
});
