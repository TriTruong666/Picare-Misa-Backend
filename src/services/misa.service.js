const axios = require("axios");
const Order = require("../models/order.model");
const MisaCustomer = require("../models/misa_customer.model");
const MisaStock = require("../models/misa_stock.model");
const MisaProduct = require("../models/misa_product.model");
const OrderDetail = require("../models/order_detail.model");

async function connectAmisMisa() {
  try {
    const body = {
      app_id: process.env.MISA_APP_ID,
      access_code: process.env.MISA_ACCESS_CODE,
      org_company_code: process.env.MISA_ORG_COMPANY_CODE,
    };
    const res = await axios.post(
      "https://actapp.misa.vn/api/oauth/actopen/connect",
      body,
      {
        headers: {
          "X-MISA-AccessToken": process.env.MISA_ACCESS_CODE,
        },
      }
    );
    return JSON.parse(res.data.Data);
  } catch (err) {
    console.error(` Misa Error:`, err.message);
  }
}

async function postMisaDataService(accessToken, type = 1) {
  const body = {
    data_type: type,
    branch_id: null,
    skip: 0,
    take: 1000,
    app_id: process.env.MISA_APP_ID,
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
    console.error(` Misa Error:`, err.message);
  }
}

const sourceCustomerMap = {
  "Shopee Picare": "Shopee Picare",
  "Shopee Easydew": "Shopee Easydew",
  Lazada: "Lazada Picare",
  Tiki: "Tiki Picare",
  "Tiktok Shop": "Tiktok Picare",
};

async function getCustomerFromSource(orderSource) {
  const accountObjectName = sourceCustomerMap[orderSource];
  if (!accountObjectName) {
    throw new Error(`Không tìm thấy mapping cho source: ${orderSource}`);
  }

  const customer = await MisaCustomer.findOne({
    where: { account_object_name: accountObjectName },
  });

  if (!customer) {
    throw new Error(
      `Không tìm thấy customer trong Misa với tên: ${accountObjectName}`
    );
  }

  return customer;
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
    const customer = await getCustomerFromSource(order.source);

    if (!stock || !customer)
      throw new Error("Thiếu thông tin stock hoặc customer");

    const refId = crypto.randomUUID();
    const refDetailId = crypto.randomUUID();

    const detail = await Promise.all(
      order.line_items.map(async (item, index) => {
        const misaProduct = await MisaProduct.findOne({
          where: { inventory_item_code: item.sku },
        });

        if (!misaProduct) {
          throw new Error(`Không tìm thấy MisaProduct cho SKU: ${item.sku}`);
        }

        const taxRate = misaProduct.tax_rate || 0;
        const priceAfterTax = item.price; // giá client gửi đã có VAT
        const priceBeforeTax = taxRate
          ? priceAfterTax / (1 + taxRate / 100)
          : priceAfterTax;
        const vatAmount = priceAfterTax - priceBeforeTax;

        return {
          ref_detail_id: refDetailId,
          refid: refId,
          org_refid: refId,

          inventory_item_id: misaProduct.inventory_item_id,
          inventory_item_code: misaProduct.inventory_item_code,
          inventory_item_name: misaProduct.inventory_item_name,
          inventory_item_type: 0,

          stock_id: stock.stock_id,
          stock_code: stock.stock_code,
          stock_name: stock.stock_name,

          unit_id: misaProduct.unit_id,
          unit_name: misaProduct.unit_name,

          account_object_id: customer.account_object_id,
          sort_order: index + 1,

          quantity: item.qty,
          amount: priceBeforeTax * item.qty,
          amount_oc: priceBeforeTax * item.qty,

          discount_rate: null,
          discount_amount: order.totalDiscountPrice || 0,
          discount_amount_oc: order.totalDiscountPrice || 0,

          main_quantity: item.qty,
          main_convert_rate: null,
          main_unit_id: misaProduct.unit_id,
          main_unit_name: misaProduct.unit_name,
          main_unit_price: priceBeforeTax,

          vat_rate: taxRate,
          vat_amount: vatAmount * item.qty,
          vat_amount_oc: vatAmount * item.qty,

          description: item.productName,

          exchange_rate_operator: "*",
          unit_price: priceBeforeTax,

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
      account_object_id: customer.account_object_id,
      account_object_address: customer.address,
      account_object_name: customer.account_object_name,
      account_object_code: customer.account_object_code,

      refdate: order.createdAt,

      // ---- Các field bổ sung theo mẫu MISA ----
      status: 0,
      delivered_status: 0,
      due_day: 15,
      is_calculated_cost: false,
      exchange_rate: 1,
      journal_memo: `${order.orderId} - ${customer.account_object_name} ${
        order.totalDiscountPrice > 0 ? "- CoCK" : ""
      } `,
      shipping_address: customer.address,
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
      app_id: process.env.MISA_APP_ID,
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
    console.error(" Misa Error:", err.message);
    throw err;
  }
}
module.exports = {
  connectAmisMisa,
  postMisaDataService,
  postSaleDocumentMisaService,
};
