const axios = require("axios");
const Order = require("../models/order.model");
const MisaStock = require("../models/misa_stock.model");
const MisaProduct = require("../models/misa_product.model");
const OrderDetail = require("../models/order_detail.model");
const MisaCombo = require("../models/misa_combo.model");
const { parseComboSku } = require("../utils/utils");

async function connectAmisMisa() {
  try {
    const body = {
      app_id: process.env.MISA_PICARE_APP_ID,
      access_code: process.env.MISA_PICARE_ACCESS_CODE,
      org_company_code: process.env.MISA_PICARE_ORG_COMPANY_CODE,
    };
    const res = await axios.post(
      "https://actapp.misa.vn/api/oauth/actopen/connect",
      body,
      {
        headers: {
          "X-MISA-AccessToken": process.env.MISA_PICARE_ACCESS_CODE,
        },
      }
    );
    return JSON.parse(res.data.Data);
  } catch (err) {
    console.error(` Misa Error:`, err.message);
  }
}

async function postMisaDataService(
  accessToken,
  type = 2,
  skip = 0,
  take = 1000
) {
  const body = {
    data_type: type,
    branch_id: null,
    skip: skip,
    take: take,
    app_id: process.env.MISA_PICARE_APP_ID,
    last_sync_time: null,
  };

  try {
    const res = await axios.post(
      "https://actapp.misa.vn/apir/sync/actopen/get_dictionary",
      body,
      {
        headers: {
          "X-MISA-AccessToken": accessToken,
        },
      }
    );
    return JSON.parse(res.data.Data);
  } catch (err) {
    console.error(`Misa Error:`, err.message);
    return null;
  }
}

const sourceCustomerAccountObjectIdMap = {
  "Shopee Picare": "08acf98f-080c-4c74-aa72-da16642c4f0f",
  "Shopee Easydew": "76fda269-328d-4bc7-9755-0d01b05d8ccc",
  "Lazada Picare": "984b48e2-5de1-4427-bffd-7098977ed124",
  "Lazada Easydew": "50f1c0d5-8af2-4ba4-9865-cc272e235d65",
  Tiki: "920fa0ab-d5fa-4216-9a92-7315adcd73c2",
  "Tiktok Shop": "32f05ee1-d1b8-428a-905f-67914716f904",
};

const sourceCustomerAccountObjectCodeMap = {
  "Shopee Picare": "KHACHLE_SHOPEE PICARE",
  "Shopee Easydew": "KHACHLE_SHOPEE EASYDEW",
  "Lazada Picare": "KHACHLE_LAZADA PICARE",
  "Lazada Easydew": "KHACHLE_LAZADA EASYDEW",
  Tiki: "KHACHLE_TIKI PICARE",
  "Tiktok Shop": "KHACHLE_TIKTOK PICARE",
};

async function getCustomerFromSource(orderSource) {
  const accountMappingId = sourceCustomerAccountObjectIdMap[orderSource];
  const accountMappingCode = sourceCustomerAccountObjectCodeMap[orderSource];
  return { accountMappingCode, accountMappingId };
}

async function postSaleDocumentMisaService(accessToken, { orderId }) {
  try {
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

    if (!order) throw new Error("Không tìm thấy Order");

    const stock = await MisaStock.findOne({
      where: { stock_code: "KHO_CHAN_HUNG" },
    });
    const { accountMappingCode, accountMappingId } =
      await getCustomerFromSource(order.source);

    if (!stock) throw new Error("Thiếu thông tin stock");

    const refId = crypto.randomUUID();
    const refDetailId = crypto.randomUUID();
    const giagiam = order.totalDiscountPrice;
    const tongdon = order.totalLineItemPrice;
    const discountRatio = tongdon > 0 ? giagiam / tongdon : 0;
    const detail = await Promise.all(
      order.line_items.map(async (item, index) => {
        const { isCombo, baseSku, multiplier } = parseComboSku(item.sku);
        const misaProduct = await MisaProduct.findOne({
          where: { inventory_item_code: baseSku },
        });
        if (!misaProduct) {
          throw new Error(`Không tìm thấy MisaProduct cho SKU: ${item.sku}`);
        }

        let finalQty = item.qty;

        if (isCombo) {
          const combo = await MisaCombo.findOne({
            where: { inventoryItemCode: baseSku },
          });

          if (!combo) {
            throw new Error(`Không tìm thấy combo cho SKU: ${baseSku}`);
          }

          finalQty = item.qty * combo.quantity * multiplier;
        }

        const taxRate = misaProduct.tax_rate || 0;

        const round = (n) => Math.round(n * 100) / 100;

        const priceBeforeTax = round(item.price - discountRatio * item.price);

        const priceAfterTax = taxRate
          ? round(priceBeforeTax / (1 + taxRate / 100))
          : priceBeforeTax;

        const vatAmount = round(priceBeforeTax - priceAfterTax);

        return {
          ref_detail_id: refDetailId,
          refid: refId,
          org_refid: refId,

          inventory_item_id: misaProduct.inventory_item_id,
          inventory_item_code: isCombo
            ? item.sku
            : misaProduct.inventory_item_code,
          inventory_item_name:
            priceAfterTax === 0
              ? misaProduct.inventory_item_name +
                " (Hàng khuyến mãi không thu tiền)"
              : misaProduct.inventory_item_name,
          inventory_item_type: 0,

          stock_id: stock.stock_id,
          stock_code: stock.stock_code,
          stock_name: stock.stock_name,

          unit_id: misaProduct.unit_id || "Không",
          unit_name: misaProduct.unit_name || "Không",

          account_object_id: accountMappingId,
          sort_order: index + 1,

          quantity: finalQty,
          amount: priceAfterTax * finalQty,
          amount_oc: priceAfterTax * finalQty,

          discount_rate: null,
          // discount_amount: index === 0 ? order.totalDiscountPrice || 0 : 0,
          // discount_amount_oc: index === 0 ? order.totalDiscountPrice || 0 : 0,

          main_quantity: finalQty,
          main_convert_rate: null,
          main_unit_id: misaProduct.unit_id,
          main_unit_name: misaProduct.unit_name,
          main_unit_price: priceBeforeTax,

          vat_rate: taxRate,
          vat_amount: vatAmount * finalQty,
          vat_amount_oc: vatAmount * finalQty,

          description:
            priceAfterTax === 0
              ? misaProduct.inventory_item_name +
                " (Hàng khuyến mãi không thu tiền)"
              : misaProduct.inventory_item_name,

          exchange_rate_operator: "*",
          unit_price: priceAfterTax,

          is_promotion: false,
          is_unit_price_after_tax: false,

          quantity_delivered: 0,
          quantity_remain: 0,
          is_description: false,

          discount_type: 1,
          discount_rate_voucher: 0,
          state: 1,

          status: 0,
        };
      })
    );

    const total_amount = detail.reduce((sum, d) => sum + d.amount, 0);
    const total_vat_amount = detail.reduce((sum, d) => sum + d.vat_amount, 0);

    const voucher = {
      voucher_type: 20,
      is_get_new_id: true,
      is_allow_group: false,
      org_refid: refId,
      refid: refId,
      org_reftype: 3520,
      org_reftype_name: "Đơn đặt hàng",
      act_voucher_type: 0,

      refno: order.orderId,
      custom_field1: order.haravanId,
      org_refno: order.orderId,
      refno_finance: order.orderId,

      branch_id: "f8088e57-2ec5-4ddc-943e-783179ad001d",

      // customer info
      account_object_id: accountMappingId,
      account_object_address: order.address,
      account_object_name: order.customerName,
      account_object_code: accountMappingCode,

      refdate: order.createdAt,

      // ---- Các field bổ sung theo mẫu MISA ----
      status: 0,
      delivered_status: 0,
      due_day: 15,
      is_calculated_cost: false,
      exchange_rate: 1,
      journal_memo: `${order.source} - ${order.orderId} ${
        order.totalDiscountPrice > 0 ? "- CoCK" : ""
      } `,
      shipping_address: order.address,
      currency_id: "VND",
      discount_type: 1,
      discount_rate_voucher: 0,
      total_amount_made: 0,
      revenue_status: 0,
      total_receipted_amount: 0,
      is_invoiced: false,
      check_quantity: false,
      excel_row_index: 0,
      is_valid: false,
      reftype: 3520,
      receiver: order.customerName,
      auto_refno: true,
      state: 0,

      // money info (dùng tổng detail)
      total_amount_oc: total_amount,
      total_amount: total_amount,
      total_sale_amount: total_amount,
      total_sale_amount_oc: total_amount,
      total_invoice_amount: total_amount,
      total_invoice_amount_oc: total_amount,
      total_vat_amount_oc: total_vat_amount,
      detail,
    };

    const body = {
      org_company_code: "k6aguh1l",
      app_id: process.env.MISA_PICARE_APP_ID,
      voucher: [voucher],
    };
    const res = await axios.post(
      "https://actapp.misa.vn/apir/sync/actopen/save",
      body,
      {
        headers: { "X-MISA-AccessToken": accessToken },
      }
    );

    return { data: res.data, refId, refDetailId };
  } catch (err) {
    throw err;
  }
}

async function deleteMisaDataService() {
  try {
    const body = {
      voucher: [
        {
          voucher_type: 20,
          org_refid: "db7abc10-f07f-4349-bb3c-41783a519071",
        },
      ],
      app_id: process.env.MISA_PICARE_APP_ID,
      org_company_code: "k6aguh1l",
    };
    const res = await axios.delete(
      "https://actapp.misa.vn/apir/sync/actopen/delete",
      body,
      {
        headers: { "X-MISA-AccessToken": accessToken },
      }
    );
    return res.data;
  } catch (err) {
    throw err;
  }
}

module.exports = {
  connectAmisMisa,
  postMisaDataService,
  postSaleDocumentMisaService,
  deleteMisaDataService,
};
