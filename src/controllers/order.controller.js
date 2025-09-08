const Order = require("../models/order.model");
const { fetchHaravanOrders } = require("../services/haravan.service");

class OrderController {
  static async getOrders(req, res) {
    try {
      const orders = await Order.findAll();
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  static async syncHaravanOrders(req, res) {
    try {
      const haravanOrders = await fetchHaravanOrders();
      console.log("✅ Đã fetch từ Haravan:", haravanOrders.length, "orders");

      for (const hvOrder of haravanOrders) {
        const mappedSource = getSourceFromHaravanOrder(hvOrder);
        await Order.upsert({
          orderId: hvOrder.order_number.toString(),
          saleDate: hvOrder.created_at.toString(),
          financialStatus: hvOrder.financial_status,
          carrierStatus:
            hvOrder.fulfillments?.[0]?.carrier_status_code || "not_deliver",
          source: mappedSource,
          cancelledStatus: hvOrder.cancelled_status,
        });
      }
      res.json({ message: "Đồng bộ thành công" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
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
        source = branchName;
      } else if (branchName.includes("Easydew Việt Nam")) {
        source = branchName;
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

module.exports = OrderController;
