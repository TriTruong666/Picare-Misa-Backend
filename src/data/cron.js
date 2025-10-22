const cron = require("node-cron");
const { Op } = require("sequelize");
const { sendSse } = require("../config/sse");
const dayjs = require("dayjs");
const { runSyncHaravanOrders } = require("../controllers/order.controller");
const {
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
const OrderDetail = require("../models/order_detail.model");

cron.schedule("0,30 * * * *", async () => cronSyncHaravanOrder());
cron.schedule("*/10 * * * *", async () => cronSyncAttendanceGoogleSheet());
cron.schedule("0,30 * * * *", async () => buildDocmentMisaStockOrder());
cron.schedule("*/30 * * * * *", () => {
  sendSse({
    status: "health",
    message: "Server Online",
  });
});
cron.schedule("0,20,40 * * * *", async () => misaCronInitData());
cron.schedule("29,59 * * * *", () => {
  sendSse({
    status: "warning",
    message: "Hệ thống sẽ đồng bộ đơn Haravan trong vòng 1 phút nữa",
    type: "notification",
  });
  console.log("Prepare Sync Haravan...");
});
cron.schedule("0 0 * * *", async () => cronDeleteOrder());

async function cronDeleteOrder() {
  try {
    const startDate = dayjs().subtract(7, "day").startOf("day").toDate();
    const endDate = dayjs().subtract(4, "day").endOf("day").toDate();

    const orders = await Order.findAll({
      where: {
        saleDate: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: { model: OrderDetail, as: "line_items" },
    });
    for (const order of orders) {
      await order.destroy();
      console.log(`Đã tự động xoá đơn ${order.orderId} (${order.saleDate})`);
    }
  } catch (error) {
    console.error("Lỗi khi xoá đơn:", error);
  }
}

async function misaCronInitData() {
  try {
    await initialMisaConnection();
    console.log("Đã kết nối MISA");

    const config = await MisaConfig.findByPk(1);
    if (!config || !config.accessToken) {
      throw new Error("Không tìm thấy accessToken trong DB");
    }
    const accessToken = config.accessToken;

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

async function cronSyncHaravanOrder() {
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
}

async function cronSyncAttendanceGoogleSheet() {
  try {
    await syncAttendanceEmployeeAll(75);
    await syncAttendanceEmployeeAll(104);

    console.log("Đồng bộ chấm công tự động thành công");
  } catch (err) {
    console.error("❌ Cron job error:", err.message || err);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildDocmentMisaStockOrder() {
  try {
    const startOfDay = dayjs().subtract(3, "day").startOf("day").toDate();
    const endOfDay = dayjs().endOf("day").toDate();

    const stockOrders = await Order.findAll({
      where: {
        status: {
          [Op.or]: ["pending", "stock", "invoice"],
        },
        carrierStatus: {
          [Op.or]: ["delivered", "delivering"],
        },
        realCarrierStatus: "success",
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
      await delay(5000);
    }
  } catch (error) {
    console.error(`Lỗi tự động Misa:`, error);
  }
}
