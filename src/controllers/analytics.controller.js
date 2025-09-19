const Order = require("../models/order.model");

class AnalyticsController {
  static async countAllOrder(req, res) {
    try {
      const { type } = req.query;

      const allOrderCount = Order.findAndCountAll();
      const tiktokOrderCount = Order.findAndCountAll({
        where: { source: "Tiktok Shop" },
      });
      const tikiOrderCount = Order.findAndCountAll({
        where: { source: "Tiki" },
      });
      const lazadaOrderCount = Order.findAndCountAll({
        where: { source: "Lazada" },
      });
      const webOrderCount = Order.findAndCountAll({
        where: { source: "Website" },
      });
      const zaloOrderCount = Order.findAndCountAll({
        where: { source: "Website" },
      });
      const easydewOrderCount = Order.findAndCountAll({
        where: { source: "Shopee - Easydew" },
      });
      const picareOrderCount = Order.findAndCountAll({
        where: { source: "Shopee - Picare" },
      });
      const pendingOrderCount = Order.findAndCountAll({
        where: { carrierStatus: "pending" },
      });
      const readytopickOrderCount = Order.findAndCountAll({
        where: { carrierStatus: "readytopick" },
      });
      const deliveringOrderCount = Order.findAndCountAll({
        where: { carrierStatus: "delivering" },
      });
      const deliveredOrderCount = Order.findAndCountAll({
        where: { carrierStatus: "delivered" },
      });
      const cancelOrderCount = Order.findAndCountAll({
        where: { cancelledStatus: "cancelled" },
      });
      if (type === "all") {
        return res.json({
          count: allOrderCount,
          tiki: tikiOrderCount,
          tiktok: tiktokOrderCount,
          lazada: lazadaOrderCount,
          web: webOrderCount,
          zalo: zaloOrderCount,
          easydew: easydewOrderCount,
          picare: picareOrderCount,
          pending: pendingOrderCount,
          readytopick: readytopickOrderCount,
          delivering: deliveringOrderCount,
          delivered: deliveredOrderCount,
          cancel: cancelOrderCount,
        });
      }
      if (type === "source") {
        return res.json({
          all: allOrderCount,
          tiki: tikiOrderCount,
          tiktok: tiktokOrderCount,
          lazada: lazadaOrderCount,
          web: webOrderCount,
          zalo: zaloOrderCount,
          easydew: easydewOrderCount,
          picare: picareOrderCount,
        });
      }
      if (type === "carrier") {
        return res.json({
          all: allOrderCount,
          pending: pendingOrderCount,
          readytopick: readytopickOrderCount,
          delivering: deliveringOrderCount,
          delivered: deliveredOrderCount,
          cancel: cancelOrderCount,
        });
      } else {
        return res.status(200).json({
          message: "Thống kê không hợp lệ xin vui lòng kiểm tra lại",
        });
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = { AnalyticsController };
