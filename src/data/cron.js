const cron = require("node-cron");
const { sendSse } = require("../config/sse");
const { fetchAllHaravanOrders } = require("../services/haravan.service");
const { Op } = require("sequelize");
const Order = require("../models/order.model");
const OrderDetail = require("../models/order_detail.model");

async function runSyncHaravanOrders() {
  const haravanOrders = await fetchAllHaravanOrders();
  console.log("✅ Đã fetch từ Haravan:", haravanOrders.length, "orders");

  const existingOrders = await Order.findAll({
    attributes: ["orderId"],
    where: { status: { [Op.not]: null } },
    raw: true,
  });
  const processedOrderIds = new Set(existingOrders.map((o) => o.orderId));

  for (const hvOrder of haravanOrders) {
    const orderId = hvOrder.order_number.toString();

    if (processedOrderIds.has(orderId)) continue;

    await Order.upsert({
      orderId,
      haravanId: hvOrder.number,
      saleDate: hvOrder.created_at.toString(),
      financialStatus: hvOrder.financial_status,
      carrierStatus:
        hvOrder.fulfillments?.[0]?.carrier_status_code || "not_deliver",
      realCarrierStatus:
        hvOrder.fulfillments?.[0]?.status || "not_real_deliver",
      source: getSourceFromHaravanOrder(hvOrder),
      cancelledStatus: hvOrder.cancelled_status,
      totalPrice: parseFloat(hvOrder.total_price),
      totalLineItemPrice: parseFloat(hvOrder.total_line_items_price),
      totalDiscountPrice: parseFloat(hvOrder.total_discounts),
      status: "pending",
    });

    await OrderDetail.destroy({ where: { orderId } });

    const lineItems = hvOrder.line_items.map((item) => ({
      orderId,
      sku: item.sku,
      price: parseFloat(item.price),
      qty: item.quantity,
      productName: item.title,
    }));

    if (lineItems.length > 0) {
      await OrderDetail.bulkCreate(lineItems);
    }
  }

  return { synced: haravanOrders.length };
}

function getSourceFromHaravanOrder(hvOrder) {
  let source = "";

  if (
    hvOrder.note_attributes &&
    hvOrder.source === "shopee" &&
    Array.isArray(hvOrder.note_attributes)
  ) {
    const branchAttr = hvOrder.note_attributes.find(
      (attr) => attr.name === "X-Haravan-SalesChannel-BranchName"
    );

    if (branchAttr && branchAttr.value) {
      // Lấy nguyên giá trị branchName
      const branchName = branchAttr.value;

      // Tự map theo logic
      if (branchName.includes("Picare Việt Nam")) {
        source = "Shopee - Picare";
      } else if (branchName.includes("Easydew Việt Nam")) {
        source = "Shopee - Easydew";
      }
    }
  } else if (hvOrder.source === "tiktokshop") {
    source = "Tiktok Shop";
  } else if (hvOrder.source === "tiki") {
    source = "Tiki";
  } else if (hvOrder.source === "lazada") {
    source = "Lazada";
  } else if (hvOrder.source === "web") {
    source = "Website";
  } else if (hvOrder.source === "zalo") {
    source = "Zalo Mini App";
  }

  return source;
}

cron.schedule("*/29 * * * *", () => {
  sendSse({
    status: "warning",
    message: "Hệ thống sẽ đồng bộ đơn Haravan trong vòng 1 phút nữa",
    type: "notification",
  });
});

cron.schedule("40 29 * * * *", () => {
  sendSse({
    status: "warning",
    message:
      "Hệ thống sẽ tạm thời dừng để thực hiện quá trình đồng bộ, vui lòng chờ vài phút",
    type: "alert",
    isBlocked: true,
  });
});

// Job đồng bộ chính, chạy mỗi 30 phút
cron.schedule("*/30 * * * *", async () => {
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
