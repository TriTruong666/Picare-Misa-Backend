const MisaCustomer = require("../models/misa_customer.model");
const MisaProduct = require("../models/misa_product.model");
const MisaStock = require("../models/misa_stock.model");
const {
  connectAmisMisa,
  postMisaDataService,
} = require("../services/misa.service");

class MisaController {
  static async connectToMisa(req, res) {
    try {
      const data = await connectAmisMisa();
      console.log("Đã khởi tạo thành công kết nối tới Misa Amis");

      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  static async syncMisa(req, res) {
    try {
      const { access_token } = req.body;
      const type = Number(req.query.type);

      if (!access_token) {
        return res.status(200).json({
          message: "Thiếu Access Token vui lòng kết nối với AMIS trước",
        });
      }
      if (type > 3) {
        return res.status(200).json({
          message: "Vui lòng truyền đúng params",
        });
      }
      const result = await syncDataMisa(access_token, type);
      console.log("Đồng bộ dữ liệu MISA thành công");
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  static async syncAllMisa(req, res) {
    try {
      const { access_token } = req.body;

      if (!access_token) {
        return res.status(200).json({
          message: "Thiếu Access Token vui lòng kết nối với AMIS trước",
        });
      }

      console.log("=== BẮT ĐẦU SYNC TẤT CẢ DỮ LIỆU MISA ===");

      // Sync đồng thời 3 loại
      const [cusResult, productResult, stockResult] = await Promise.all([
        syncDataMisa(access_token, 1),
        syncDataMisa(access_token, 2),
        syncDataMisa(access_token, 3),
      ]);

      console.log("=== KẾT THÚC SYNC MISA ===");

      res.json({
        message: "Đồng bộ tất cả dữ liệu MISA thành công",
        success: true,
        results: {
          customers: cusResult.total,
          products: productResult.total,
          stocks: stockResult.total,
        },
      });
    } catch (err) {
      console.error("❌ Lỗi khi sync MISA:", err);
      res.status(500).json({ error: err.message });
    }
  }
}

async function syncDataMisa(access_token, type) {
  const data = await postMisaDataService(access_token, type);

  console.log("=== BẮT ĐẦU SYNC MISA ===");
  console.log("Type:", type);
  console.log("Số lượng dữ liệu lấy về từ MISA:", data.length);

  if (type === 1) {
    for (const misaItem of data) {
      await MisaCustomer.upsert({
        account_object_id: misaItem.account_object_id,
        account_object_code: misaItem.account_object_code,
        account_object_name: misaItem.account_object_name,
        account_object_group_id_list: misaItem.account_object_group_id_list,
        account_object_group_code_list: misaItem.account_object_group_code_list,
        account_object_group_name_list: misaItem.account_object_group_name_list,
        address: misaItem.address,
      });
    }
    console.log("Đã UPSERT xong khách hàng vào DB");
  }

  if (type === 2) {
    for (const misaItem of data) {
      await MisaProduct.upsert({
        inventory_item_id: misaItem.inventory_item_id,
        inventory_item_code: misaItem.inventory_item_code,
        inventory_item_name: misaItem.inventory_item_name,
        unit_id: misaItem.unit_id,
        unit_name: misaItem.unit_name,
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

  console.log("=== KẾT THÚC SYNC MISA ===");

  return {
    message: `Đồng bộ ${data.length} bản ghi thành công`,
    success: true,
    total: data.length,
  };
}

module.exports = { MisaController };
