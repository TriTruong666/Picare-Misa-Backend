const Order = require("../models/order.model");
const { literal } = require("sequelize");
const {
  fetchHaravanOrders,
  countOrdersLastWeek,
  fetchAllHaravanOrders,
} = require("../services/haravan.service");

class OrderController {
  static async getOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        status: statusParam,
        financialStatus,
        carrierStatus,
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where = {};

      // Nếu có status thì filter
      if (statusParam !== undefined) {
        if (statusParam === "true") {
          where.status = true;
        } else if (statusParam === "false") {
          where.status = false;
        } else {
          return res
            .status(400)
            .json({ error: "status must be true or false" });
        }
      }

      if (financialStatus) {
        where.financialStatus = financialStatus;
      }

      // Filter carrierStatus nếu có
      if (carrierStatus) {
        where.carrierStatus = carrierStatus;
      }

      const { count, rows } = await Order.findAndCountAll({
        where,
        limit: Number(limit),
        offset,
        order: [
          [
            literal(
              `CASE WHEN cancelledStatus = 'cancelled' THEN 1 ELSE 0 END`
            ),
            "ASC",
          ], // cancelled xuống cuối
          ["saleDate", "DESC"], // trong mỗi nhóm sort theo ngày
        ],
        attributes: { exclude: ["id"] },
      });

      res.json({
        count, // số đơn theo status filter
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        orders: rows, // danh sách đơn đã filter
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async syncHaravanOrders(req, res) {
    try {
      const haravanOrders = await fetchAllHaravanOrders();
      console.log("✅ Đã fetch từ Haravan:", haravanOrders.length, "orders");

      // Lấy toàn bộ orders trong DB (chỉ lấy orderId + status)
      const existingOrders = await Order.findAll({
        attributes: ["orderId", "status"],
        raw: true,
      });

      const statusMap = new Map(
        existingOrders.map((o) => [o.orderId, o.status])
      );

      for (const hvOrder of haravanOrders) {
        const orderId = hvOrder.order_number.toString();

        await Order.upsert({
          orderId,
          saleDate: hvOrder.created_at.toString(),
          financialStatus: hvOrder.financial_status,
          carrierStatus:
            hvOrder.fulfillments?.[0]?.carrier_status_code || "not_deliver",
          source: getSourceFromHaravanOrder(hvOrder),
          cancelledStatus: hvOrder.cancelled_status,
          totalPrice: parseFloat(hvOrder.total_price),
          status: statusMap.has(orderId) ? statusMap.get(orderId) : false,
        });
      }

      res.json({ message: "Đồng bộ thành công", synced: haravanOrders.length });
    } catch (err) {
      console.error("❌ syncHaravanOrders error:", err);
      res.status(500).json({ error: err.message });
    }
  }

  static async countOrders(req, res) {
    try {
      const count = await countOrdersLastWeek();
      res.json({ count });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  static async changeOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { status } = req.body;

      const target = await Order.findOne({
        where: { orderId: orderId },
      });

      if (!target) {
        res.status(404).json({
          message: "Không tìm thấy đơn hàng đó",
        });
      }

      target.status = status;
      await target.save();

      res.json({
        message: "Cập nhật trạng thái thành công",
      });
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

module.exports = OrderController;
