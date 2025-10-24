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
const { postSaleDocumentMisaService } = require("../services/misa.service");
const MisaConfig = require("../models/misa_config.model");
const Order = require("../models/order.model");
const EbizMisaDone = require("../models/misa_done.model");
const OrderDetail = require("../models/order_detail.model");
const EbizMisaCancel = require("../models/misa_cancel.model");
const ActivityLog = require("../models/activity_log.model");
const AttendanceUser = require("../models/attendance_user.model");

cron.schedule("28,58 * * * *", async () => cronSyncHaravanOrder());
cron.schedule("*/15 * * * *", async () => cronSyncAttendance());
cron.schedule("*/10 * * * *", async () => cronDeleteAttendanceLogs());
cron.schedule("0,30 * * * *", async () => cronBuildDocumentMisa());
cron.schedule("29,59 * * * *", async () => cronMoveCancelledOrders());
cron.schedule("*/30 * * * * *", () => {
  sendSse({
    status: "health",
    message: "Server Online",
  });
});
cron.schedule("0,20,40 * * * *", async () => misaCronInitData());
cron.schedule("27,57 * * * *", () => {
  sendSse({
    status: "warning",
    message: "Hệ thống sẽ đồng bộ đơn Haravan trong vòng 1 phút nữa",
    type: "notification",
  });
});
cron.schedule("0 0 * * *", async () => cronDeleteOrder());
cron.schedule("0 0 * * *", async () => cronDeleteActivityLogs());

async function cronDeleteAttendanceLogs() {
  try {
    const startDate = dayjs().subtract(30, "day").startOf("day").toDate();
    const endDate = dayjs().subtract(3, "day").endOf("day").toDate();
    let countLogs = 0;
    const attendanceLogs = await AttendanceUser.findAll({
      where: {
        checkinTime: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [["checkinTime", "ASC"]],
    });
    if (attendanceLogs.length === 0) {
      console.log("Không có logs chấm công để xoá");
    }

    for (const log of attendanceLogs) {
      try {
        await log.destroy();
        console.log("Đang xóa...");
        countLogs++;
      } catch (error) {
        throw new Error(`Lỗi xoá log ${log.id}: ${error.message}`);
      }
      await delay(10);
    }
    console.log(`Đã xóa tự động ${countLogs} chấm công`);
  } catch (error) {
    console.error(error);
  }
}

async function cronDeleteActivityLogs() {
  try {
    const startDate = dayjs().subtract(7, "day").startOf("day").toDate();
    const endDate = dayjs().subtract(1, "day").endOf("day").toDate();
    const logs = await ActivityLog.findAll({
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate],
        },
      },
      order: [["createdAt", "ASC"]],
    });

    if (logs.length === 0) {
      console.log("Không có logs để xoá");
    }
    for (const log of logs) {
      try {
        await log.destroy();

        console.log(`Đã tự động xoá log ${log.id}`);
      } catch (error) {
        throw new Error(`Lỗi xoá log ${log.id}: ${error.message}`);
      }
      await delay(100);
    }
  } catch (error) {
    console.error(error);
  }
}

async function cronMoveCancelledOrders() {
  try {
    console.log("Bắt đầu kiểm tra đơn huỷ MISA...");

    // Lấy các đơn đã xin chứng từ (EbizMisaDone)
    const misaDoneOrders = await EbizMisaDone.findAll({
      attributes: [
        "orderId",
        "haravanId",
        "saleDate",
        "financialStatus",
        "carrierStatus",
        "realCarrierStatus",
        "totalPrice",
        "totalLineItemPrice",
        "totalDiscountPrice",
        "refId",
        "refDetailId",
        "trackingNumber",
        "cancelledStatus",
        "isSPXFast",
        "source",
        "note",
      ],
      raw: true,
    });

    if (misaDoneOrders.length === 0) {
      console.log("Không có đơn MISA nào để đối chiếu huỷ.");
      return;
    }

    // Lấy danh sách orderId đã bị huỷ từ Haravan
    const cancelledOrders = await Order.findAll({
      attributes: ["orderId"],
      where: { cancelledStatus: "cancelled" },
      raw: true,
    });

    const cancelledOrderIds = new Set(cancelledOrders.map((o) => o.orderId));

    let movedCount = 0;

    for (const doneOrder of misaDoneOrders) {
      if (cancelledOrderIds.has(doneOrder.orderId)) {
        // Nếu đơn bị huỷ thì chuyển sang EbizMisaCancel
        await EbizMisaCancel.upsert(doneOrder);
        await ActivityLog.create({
          name: "System",
          type: "accounting",
          note: `Đã chuyển đơn ${doneOrder.orderId} sang bảng EbizMisaCancel.`,
        });
        await EbizMisaDone.destroy({ where: { orderId: doneOrder.orderId } });
        movedCount++;

        console.log(
          `Đã chuyển đơn ${doneOrder.orderId} sang bảng EbizMisaCancel.`
        );
      }
    }

    console.log(`Hoàn tất đối chiếu: ${movedCount} đơn bị huỷ được chuyển.`);
  } catch (error) {
    console.error("Lỗi khi chuyển đơn bị huỷ sang MISA Cancel:", error);
  }
}

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
    console.error("Đồng bộ tự động lỗi:", err.message);
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

async function cronSyncAttendance() {
  try {
    await syncAttendanceEmployeeAll(75);
    await syncAttendanceEmployeeAll(104);

    console.log("Đồng bộ chấm công tự động thành công");
  } catch (err) {
    console.error("Cron job error:", err.message || err);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cronBuildDocumentMisa() {
  try {
    const startOfDay = dayjs().subtract(3, "day").startOf("day").toDate();
    const endOfDay = dayjs().endOf("day").toDate();
    let successCount = 0;
    let failedCount = 0;

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
        successCount++;
        console.log(`Đã xin chứng từ đơn ${order.orderId}`);
      } catch (error) {
        failedCount++;
        await ActivityLog.create({
          name: "System",
          type: "accounting",
          note: `Lỗi xin chứng từ đơn ${order.orderId}: ${error.message}`,
        });
        console.error(`Lỗi xin chứng từ đơn ${order.orderId}:`, error.message);
      }
      await delay(500);
    }
    console.log(
      `Hoàn tất lập chứng từ: ${successCount} đơn thành công, ${failedCount} đơn lỗi.`
    );
  } catch (error) {
    console.error(`Lỗi tự động Misa:`, error);
  }
}
