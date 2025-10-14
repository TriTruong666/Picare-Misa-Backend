const cron = require("node-cron");
const { Op } = require("sequelize");
const { sendSse } = require("../config/sse");
const { runSyncHaravanOrders } = require("../controllers/order.controller");
const {
  syncAttendanceToSheet,
  syncAttendanceEmployeeAll,
} = require("../controllers/attendance.controller");
const {
  initialMisaConnection,
  syncDataMisa,
} = require("../controllers/misa.controller");
const MisaConfig = require("../models/misa_config.model");
const Order = require("../models/order.model");
const { postSaleDocumentMisaService } = require("../services/misa.service");

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

async function cronSyncAttendanceGoogleSheet() {
  try {
    // 1️⃣ Đồng bộ tất cả server
    const result = await syncAttendanceEmployeeAll();
    console.log("🔹 Attendance sync result:", result);
    await syncAttendanceToSheet();

    console.log("✅ Cron job finished successfully.");
  } catch (err) {
    console.error("❌ Cron job error:", err.message || err);
  }
}

cron.schedule("*/10 * * * *", async () => cronSyncAttendanceGoogleSheet());

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildDocmentMisaStockOrder() {
  try {
    const stockOrders = await Order.findAll({
      where: {
        status: "pending",
        carrierStatus: {
          [Op.or]: ["delivered", "delivering"],
        },
      },
      order: [["saleDate", "ASC"]],
    });

    const config = await MisaConfig.findByPk(1);
    if (!config || !config.accessToken) {
      await initialMisaConnection();
    }

    if (stockOrders.length === 0) {
      console.log("Xin chứng từ tự động dùng lại, hết đơn để xử lý");
      return;
    }

    for (const order of stockOrders) {
      try {
        await postSaleDocumentMisaService(config.accessToken, {
          orderId: order.orderId,
        });
        await order.update({ status: "completed" });
        console.log(`Đã xin chứng từ đơn ${order.orderId}`);
      } catch (error) {
        console.error(` Lỗi xin chứng từ đơn ${order.orderId}:`, error.message);
      }
      await delay(30000);
    }
  } catch (error) {
    console.error(`Lỗi tự động Misa:`, error);
  }
}

cron.schedule("0 * * * *", async () => buildDocmentMisaStockOrder());
