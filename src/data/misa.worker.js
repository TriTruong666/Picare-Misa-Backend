const dayjs = require("dayjs");
const Order = require("../models/order.model");
const { Op } = require("sequelize");
const MisaConfig = require("../models/misa_config.model");
const { initialMisaConnection } = require("../controllers/misa.controller");
const EbizMisaDone = require("../models/misa_done.model");
const { postSaleDocumentMisaService } = require("../services/misa.service");
const ActivityLog = require("../models/activity_log.model");
const { delay } = require("../utils/utils");

async function cronBuildDocumentMisa() {
  try {
    const startOfDay = dayjs().subtract(9, "day").startOf("day").toDate();
    const endOfDay = dayjs().endOf("day").toDate();
    let successCount = 0;
    let failedCount = 0;
    let doneCount = 0;

    const stockOrders = await Order.findAll({
      where: {
        status: {
          [Op.or]: ["pending", "stock", "invoice"],
        },
        carrierStatus: {
          [Op.or]: ["delivered"],
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
        const doneOrder = await EbizMisaDone.findOne({
          where: { orderId: order.orderId },
        });
        if (doneOrder) {
          doneCount++;
          continue;
        }

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
          address: order.address,
          customerName: order.customerName,
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
      await delay(600);
    }
    console.log(
      `Hoàn tất lập chứng từ: ${successCount} đơn thành công, ${failedCount} đơn lỗi, ${doneCount} đơn đã bị duplicate`
    );
  } catch (error) {
    console.error(`Lỗi tự động Misa:`, error);
  }
}
