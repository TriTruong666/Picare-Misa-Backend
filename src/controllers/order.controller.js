const Order = require("../models/order.model");
const OrderDetail = require("../models/order_detail.model");
const { literal, Op } = require("sequelize");
const {
  countOrdersLastWeek,
  fetchAllHaravanOrders,
} = require("../services/haravan.service");

class OrderController {
  static async getOrders(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        status,
        financialStatus,
        carrierStatus,
        realCarrierStatus,
        source,
        cancelledStatus,
        orderId,
      } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where = {};

      // Nếu có status thì filter
      if (status) {
        where.status = status;
      }

      if (financialStatus) {
        where.financialStatus = financialStatus;
      }

      // Filter carrierStatus nếu có
      if (carrierStatus) {
        const cstatus = carrierStatus.split(",");
        where.carrierStatus = { [Op.in]: cstatus };
      }

      if (realCarrierStatus) {
        where.realCarrierStatus = realCarrierStatus;
      }
      if (cancelledStatus) {
        where.cancelledStatus = cancelledStatus;
      }
      if (source) {
        const sources = source.split(","); // tách chuỗi thành mảng
        where.source = { [Op.in]: sources };
      }

      if (orderId) {
        where.orderId = { [Op.like]: `%${orderId}%` };
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
          ],
          ["saleDate", "DESC"],
        ],
        attributes: { exclude: ["id"] },
      });

      res.json({
        count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        orders: rows,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  static async scanOrder(req, res) {
    try {
      const { trackingNumber, orderId } = req.body;
      const { isSPXFast } = req.query;

      let scannedOrder;

      if (isSPXFast === "fast") {
        scannedOrder = await Order.findOne({
          where: { orderId: orderId.trim() },
        });
      } else if (isSPXFast === "normal") {
        scannedOrder = await Order.findOne({
          where: { trackingNumber: trackingNumber.trim() },
        });
      }

      if (!scannedOrder) {
        return res.status(200).json({
          message: "Không tìm thấy đơn hàng này",
        });
      }

      if (scannedOrder.status === "stock") {
        return res.status(200).json({
          message: "Đơn hàng này đã quét rồi",
        });
      }

      if (scannedOrder.status === "invoice") {
        return res.status(200).json({
          message: "Đơn này đã được xuất hoá đơn",
        });
      }

      if (
        scannedOrder.realCarrierStatus === "success" ||
        scannedOrder.carrierStatus === "delivered"
      ) {
        return res.status(200).json({
          message: "Đơn này chỉ có thể xuất hoá đơn",
        });
      }

      scannedOrder.status = "stock";
      await scannedOrder.save();

      res.json({
        message: "Quét barcode thành công",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
      console.log(err);
    }
  }

  static async getDetailOrder(req, res) {
    try {
      const { orderId } = req.params;

      const order = await Order.findOne({
        where: { orderId },
        attributes: { exclude: ["id"] },
        include: [
          {
            model: OrderDetail,
            as: "line_items",
            attributes: { exclude: ["id", "orderId"] },
          },
        ],
      });

      if (!order) {
        return res.status(404).json({
          message: "không tìm thấy đơn hàng",
        });
      }

      res.json(order);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async searchOrders(req, res) {
    try {
      const { orderId } = req.query;

      if (!orderId) {
        return res.status(400).json({ message: "" });
      }

      const orders = await Order.findAll({
        where: {
          orderId: {
            [Op.like]: `%${orderId}%`, // tìm gần đúng
          },
        },
        attributes: { exclude: ["id"] },
        order: [["saleDate", "DESC"]],
      });

      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
      }

      res.json(orders);
    } catch (err) {
      console.error(" searchOrders error:", err);
      res.status(500).json({ error: err.message });
    }
  }

  static async syncHaravanOrders(req, res) {
    try {
      const result = await runSyncHaravanOrders();
      res.json({ message: "Đồng bộ thành công", ...result });
    } catch (err) {
      console.error(" syncHaravanOrders error:", err);
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

async function runSyncHaravanOrders() {
  try {
    const haravanOrders = await fetchAllHaravanOrders();
    console.log("Đã fetch từ Haravan:", haravanOrders.length, "orders");

    const existingOrders = await Order.findAll({
      attributes: ["orderId"],
      raw: true,
    });

    const existingOrderIds = new Set(existingOrders.map((o) => o.orderId));
    let successCount = 0;
    let failedCount = 0;

    for (const hvOrder of haravanOrders) {
      const orderId = hvOrder.order_number.toString();

      // Dữ liệu đồng bộ từ Haravan
      const hvData = {
        haravanId: hvOrder.number,
        saleDate: hvOrder.created_at.toString(),
        financialStatus: hvOrder.financial_status,
        carrierStatus:
          hvOrder.fulfillments?.[0]?.carrier_status_code || "not_deliver",
        realCarrierStatus:
          hvOrder.fulfillments?.[0]?.status || "not_real_deliver",
        source: getSourceFromHaravanOrder(hvOrder),
        isSPXFast:
          hvOrder.fulfillments?.[0]?.tracking_company === "Siêu Tốc - 4 Giờ"
            ? "fast"
            : "normal",
        cancelledStatus: hvOrder.cancelled_status,
        totalPrice: parseFloat(hvOrder.total_price),
        totalLineItemPrice: parseFloat(hvOrder.total_line_items_price),
        totalDiscountPrice: parseFloat(hvOrder.total_discounts),
        trackingNumber: hvOrder.fulfillments?.[0]?.tracking_number || null,
      };

      try {
        if (existingOrderIds.has(orderId)) {
          // 🔁 Nếu order đã tồn tại → chỉ cập nhật field Haravan (không đụng status custom)
          await Order.update(hvData, { where: { orderId } });
        } else {
          // 🆕 Nếu chưa tồn tại → tạo mới
          await Order.create({
            orderId,
            ...hvData,
            status: "pending",
          });
        }

        // Xóa chi tiết cũ rồi thêm lại chi tiết mới
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

        console.log(`Đồng bộ đơn ${orderId} thành công`);
        successCount++;
      } catch (error) {
        failedCount++;
        console.error(`Lỗi khi xử lý đơn ${orderId}:`, error.message);
      }
    }

    console.log(
      `🎯 Hoàn tất đồng bộ: ${successCount} đơn thành công, ${failedCount} đơn lỗi.`
    );
    return { synced: successCount, failed: failedCount };
  } catch (error) {
    console.error("❌ Lỗi toàn cục trong runSyncHaravanOrders:", error.message);
    throw error;
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
      const branchName = branchAttr.value;

      // Tự map theo logic
      if (branchName.includes("Picare Việt Nam")) {
        source = "Shopee Picare";
      } else if (branchName.includes("Easydew Việt Nam")) {
        source = "Shopee Easydew";
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

module.exports = { OrderController, runSyncHaravanOrders };
