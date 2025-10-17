const cron = require("node-cron");
const { Op } = require("sequelize");
const { sendSse } = require("../config/sse");
const dayjs = require("dayjs");
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
const EbizMisaDone = require("../models/misa_done.model");

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
    await syncAttendanceEmployeeAll(75);
    await syncAttendanceEmployeeAll(104);

    console.log("Đồng bộ chấm công tự động thành công");
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
    const startOfDay = dayjs().startOf("day").toDate();
    const endOfDay = dayjs().endOf("day").toDate();
    const stockOrders = await Order.findAll({
      where: {
        status: {
          [Op.or]: ["pending", "stock"],
        },
        carrierStatus: {
          [Op.or]: ["delivered", "delivering"],
        },
        cancelledStatus: "uncancelled",
        saleDate: {
          [Op.between]: [startOfDay, endOfDay],
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
        const { refId, refDetailId } = await postSaleDocumentMisaService(
          config.accessToken,
          {
            orderId: order.orderId,
          }
        );
        await EbizMisaDone.upsert({
          orderId: order.orderId,
          haravanId: order.haravanId,
          saleDate: order.saleDate,
          financialStatus: order.financialStatus,
          carrierStatus: order.carrierStatus,
          realCarrierStatus: order.realCarrierStatus,
          totalPrice: order.totalPrice,
          totalLineItemPrice: order.totalLineItemPrice,
          totalDiscountPrice: order.totalDiscountPrice,
          cancelledStatus: order.cancelledStatus,
          trackingNumber: order.trackingNumber,
          isSPXFast: order.isSPXFast,
          source: order.source,
          note: order.note,
          refId,
          refDetailId,
        });
        await order.update({ status: "completed" });
        console.log(`Đã xin chứng từ đơn ${order.orderId}`);
      } catch (error) {
        console.error(` Lỗi xin chứng từ đơn ${order.orderId}:`, error.message);
      }
      await delay(20000);
    }
  } catch (error) {
    console.error(`Lỗi tự động Misa:`, error);
  }
}

cron.schedule("0 * * * *", async () => buildDocmentMisaStockOrder());
