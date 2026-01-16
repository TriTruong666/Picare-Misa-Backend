const MisaConfig = require("../models/misa_config.model");
const MisaCustomer = require("../models/misa_customer.model");
const EbizMisaDone = require("../models/misa_done.model");
const MisaProduct = require("../models/misa_product.model");
const MisaStock = require("../models/misa_stock.model");
const Order = require("../models/order.model");
const {
  connectAmisMisa,
  postMisaDataService,
  postSaleDocumentMisaService,
} = require("../services/misa.service");

class MisaController {
  static async connectToMisa(req, res) {
    try {
      const result = await initialMisaConnection();

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  static async syncMisa(req, res) {
    try {
      const type = Number(req.query.type);

      if (type > 3 || type < 1) {
        return res.status(400).json({
          message:
            "Vui lòng truyền đúng params type (1=Customer, 2=Product, 3=Stock)",
        });
      }

      const config = await MisaConfig.findByPk(1);
      if (!config || !config.accessToken) {
        return res.status(400).json({
          message: "Thiếu Access Token, vui lòng kết nối AMIS trước",
        });
      }

      const result = await syncDataMisa(config.accessToken, type);
      console.log("Đồng bộ dữ liệu MISA thành công");
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async syncAllMisa(req, res) {
    try {
      const config = await MisaConfig.findByPk(1);
      if (!config || !config.accessToken) {
        return res.status(400).json({
          message: "Thiếu Access Token, vui lòng kết nối AMIS trước",
        });
      }

      console.log("=== BẮT ĐẦU SYNC TẤT CẢ DỮ LIỆU MISA ===");

      await Promise.all([
        syncDataMisa(config.accessToken, 2),
        syncDataMisa(config.accessToken, 3),
      ]);

      console.log("=== KẾT THÚC SYNC MISA ===");

      res.json({
        message: "Đồng bộ tất cả dữ liệu MISA thành công",
      });
    } catch (err) {
      console.error(" Lỗi khi sync MISA:", err);
      res.status(500).json({ error: err.message });
    }
  }

  static async countMisaData(req, res) {
    try {
      const customerCount = await MisaCustomer.findAndCountAll();
      const productCount = await MisaProduct.findAndCountAll();
      const stockCount = await MisaStock.findAndCountAll();

      res.json({
        customers: customerCount.count,
        products: productCount.count,
        stocks: stockCount.count,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async buildOrderMisa(req, res) {
    try {
      const { orderId } = req.body;

      if (!orderId) {
        return res.status(400).json({ error: "Thiếu orderId" });
      }

      const order = await Order.findOne({ where: { orderId } });
      if (!order) {
        return res.status(404).json({ error: "Không tìm thấy đơn hàng" });
      }

      const config = await MisaConfig.findByPk(1);
      if (!config || !config.accessToken) {
        await initialMisaConnection();
      }

      const { data, refId, refDetailId } = await postSaleDocumentMisaService(
        config.accessToken,
        { orderId }
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

      res.json({
        message: "Đẩy đơn hàng sang MISA thành công",
        data,
        refId,
        refDetailId,
      });
    } catch (err) {
      console.error("buildOrderMisa Error:", err);
      res.status(500).json({ error: err.message });
    }
  }

  static async getMisaAccount(req, res) {
    try {
      const accounts = await MisaCustomer.findAll();
      res.json(accounts);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getMisaStock(req, res) {
    try {
      const stocks = await MisaStock.findAll();
      res.json(stocks);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getMisaConfig(req, res) {
    try {
      const config = await MisaConfig.findOne({
        where: { id: 1 },
        attributes: {
          exclude: ["id"],
        },
      });

      res.json(config);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

async function initialMisaConnection() {
  const data = await connectAmisMisa();
  console.log("Đã khởi tạo thành công kết nối tới Misa Amis");

  const accessToken = data?.access_token || data?.AccessToken;

  if (!accessToken) {
    throw new Error("Không lấy được accessToken từ MISA");
  }

  await MisaConfig.upsert({
    id: 1,
    accessToken,
  });

  return { message: "Kết nối thành công tới Misa Amis" };
}

async function syncDataMisa(access_token, type) {
  const data = await postMisaDataService(access_token, type);

  if (type === 2) {
    for (const misaItem of data) {
      let unitName = '';
       if (!misaItem.unit_name) {
          const unitList = JSON.parse(misaItem.unit_list);
          // Lấy unit_name của phần tử đầu tiên trong mảng
          if (unitList && unitList.length > 0) {
            unitName = unitList[0].unit_name;
          }
        }
        else{
          unitName = misaItem.unit_name
        }
      await MisaProduct.upsert({
        inventory_item_id: misaItem.inventory_item_id,
        inventory_item_code: misaItem.inventory_item_code,
        inventory_item_name: misaItem.inventory_item_name,
        unit_id: misaItem.unit_id,
        unit_name: unitName,
        tax_rate: parseInt(misaItem.tax_rate) || 0,
      });
    }
    console.log("Đã UPSERT xong sản phẩm vào DB");
  }

  if (type === 3) {
    for (const misaItem of data) {
      await MisaStock.upsert({
        stock_id: misaItem.stock_id,
        stock_code: misaItem.stock_code,
        stock_name: misaItem.stock_name,
        description: misaItem.description,
      });
    }
    console.log("Đã UPSERT xong kho vào DB");
  }

  return {
    message: `Đồng bộ ${data.length} bản ghi thành công`,
    data
  };
}

module.exports = { MisaController, initialMisaConnection, syncDataMisa };
