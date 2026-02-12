const axios = require("axios");
const Order = require("../models/order.model");
const MisaStock = require("../models/misa_stock.model");
const MisaProduct = require("../models/misa_product.model");
const OrderDetail = require("../models/order_detail.model");
const MisaCombo = require("../models/misa_combo.model");
const { parseComboSku, findNullFields } = require("../utils/utils");
const { fetchWithRetry } = require("../utils/utils");

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
  "Tiki": "920fa0ab-d5fa-4216-9a92-7315adcd73c2",
  "Tiktok Shop": "32f05ee1-d1b8-428a-905f-67914716f904",
  "Shopee Malay": "bf274386-3c11-4932-99b2-2d7baa0c0e97",
  "Shopee Philipin": "a0c927f5-4ce2-4511-936e-3edb62fa6267",
};

const sourceCustomerAccountObjectCodeMap = {
  "Shopee Picare": "KHACHLE_SHOPEE PICARE",
  "Shopee Easydew": "KHACHLE_SHOPEE EASYDEW",
  "Lazada Picare": "KHACHLE_LAZADA PICARE",
  "Lazada Easydew": "KHACHLE_LAZADA EASYDEW",
  "Tiki": "KHACHLE_TIKI PICARE",
  "Tiktok Shop": "KHACHLE_TIKTOK PICARE",
  "Shopee Malay": "KHACHLE_SHOPEE MALAY",
  "Shopee Philipin": "KHACHLE_SHOPEE PHILIPIN",
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
    // const detail = await Promise.all(
    //   order.line_items.map(async (item, index) => {
    //     const { isCombo, baseSku, multiplier } = parseComboSku(item.sku);

    //     const misaProduct = await MisaProduct.findOne({
    //       where: { inventory_item_code: baseSku },
    //     });

    //     if (!misaProduct) {
    //       throw new Error(`Không tìm thấy MisaProduct cho SKU gốc: ${baseSku}`);
    //     }

    //     let finalQty = item.qty;

    //     if (isCombo) {
    //       const combo = await MisaCombo.findOne({
    //         where: { inventoryItemCode: baseSku },
    //       });

    //       if (!combo) {
    //         throw new Error(`Không tìm thấy combo cho SKU: ${baseSku}`);
    //       }

    //       finalQty = item.qty * combo.quantity * multiplier;
    //     }

    //     const taxRate = misaProduct.tax_rate || 0;
    //     const round = (n) => Math.round(n * 100) / 100;

    //     const priceBeforeTax = round(item.price - discountRatio * item.price);
    //     const priceAfterTax = taxRate
    //       ? round(priceBeforeTax / (1 + taxRate / 100))
    //       : priceBeforeTax;

    //     const vatAmount = round(priceBeforeTax - priceAfterTax);

    //     return {
    //       ref_detail_id: crypto.randomUUID(),
    //       refid: refId,
    //       org_refid: refId,

    //       inventory_item_id: misaProduct.inventory_item_id,
    //       inventory_item_code: isCombo
    //         ? item.sku
    //         : misaProduct.inventory_item_code,
    //       inventory_item_name:
    //         priceAfterTax === 0
    //           ? misaProduct.inventory_item_name +
    //             " (Hàng khuyến mãi không thu tiền)"
    //           : misaProduct.inventory_item_name,
    //       inventory_item_type: 0,

    //       stock_id: stock.stock_id,
    //       stock_code: stock.stock_code,
    //       stock_name: stock.stock_name,

    //       unit_id: misaProduct.unit_id || "Không",
    //       unit_name: misaProduct.unit_name || "Không",

    //       account_object_id: accountMappingId,
    //       sort_order: index + 1,

    //       quantity: finalQty,
    //       amount: priceAfterTax * finalQty,
    //       amount_oc: priceAfterTax * finalQty,

    //       discount_rate: null,
    //       // discount_amount: index === 0 ? order.totalDiscountPrice || 0 : 0,
    //       // discount_amount_oc: index === 0 ? order.totalDiscountPrice || 0 : 0,

    //       main_quantity: finalQty,
    //       main_convert_rate: null,
    //       main_unit_id: misaProduct.unit_id,
    //       main_unit_name: misaProduct.unit_name,
    //       main_unit_price: priceBeforeTax,

    //       vat_rate: taxRate,
    //       vat_amount: vatAmount * finalQty,
    //       vat_amount_oc: vatAmount * finalQty,

    //       description:
    //         priceAfterTax === 0
    //           ? misaProduct.inventory_item_name +
    //             " (Hàng khuyến mãi không thu tiền)"
    //           : misaProduct.inventory_item_name,

    //       exchange_rate_operator: "*",
    //       unit_price: priceAfterTax,

    //       is_promotion: false,
    //       is_unit_price_after_tax: false,

    //       quantity_delivered: 0,
    //       quantity_remain: 0,
    //       is_description: false,

    //       discount_type: 1,
    //       discount_rate_voucher: 0,
    //       state: 1,

    //       status: 0,
    //     };
    //   })
    // );

    const detail = (
      await Promise.all(
        order.line_items.flatMap(async (item, index) => {
          const { isCombo, baseSku, multiplier } = parseComboSku(item.sku);
          const round = (n) => Math.round(n * 100) / 100;

          // ======================
          // HÀNG THƯỜNG
          // ======================
          if (!isCombo) {
            const product = await MisaProduct.findOne({
              where: { inventory_item_code: baseSku },
            });

            if (!product) {
              throw new Error(`Không tìm thấy MisaProduct: ${baseSku}`);
            }

            const taxRate = product.tax_rate ?? 0;
            const priceBeforeTax = round(
              item.price - discountRatio * item.price
            );
            const priceAfterTax = taxRate
              ? round(priceBeforeTax / (1 + taxRate / 100))
              : priceBeforeTax;
            const vatAmount = round(priceBeforeTax - priceAfterTax);

            return [
              buildBaseDetail({
                refId,
                misaProduct: product,
                stock,
                accountMappingId,
                sortOrder: index * 10 + 1,
                quantity: item.qty,
                amount: priceAfterTax * item.qty,
                priceBeforeTax,
                priceAfterTax,
                vatRate: taxRate,
                vatAmount: vatAmount * item.qty,
                inventoryItemCode: product.inventory_item_code,
                inventoryItemName:
                  priceAfterTax === 0
                    ? product.inventory_item_name +
                      " (Hàng khuyến mãi không thu tiền)"
                    : product.inventory_item_name,
                isDescription: false,
                inventoryitemid:product.inventory_item_id,
                unitid:product.unit_id,
                unitname:product.unit_name,
              }),
            ];
          }

          // ======================
          // COMBO
          // ======================
          const parentProduct = await MisaProduct.findOne({
            where: { inventory_item_code: item.sku }, // ELL009-5
          });

          const childProduct = await MisaProduct.findOne({
            where: { inventory_item_code: baseSku }, // ELL009
          });

          if (!parentProduct || !childProduct) {
            throw new Error(
              `Thiếu product combo/con: ${item.sku} / ${baseSku}`
            );
          }

          const combo = await MisaCombo.findOne({
            where: { inventoryItemCode: baseSku },
          });

          if (!combo) {
            throw new Error(`Không tìm thấy combo cho SKU: ${baseSku}`);
          }

          const realQty = item.qty * multiplier;

          const taxRate = childProduct.tax_rate ?? 0;

          const priceBeforeTax = round(item.price - discountRatio * item.price);
          const priceAfterTax = taxRate
            ? round(priceBeforeTax / (1 + taxRate / 100))
            : priceBeforeTax;
          const vatAmount = round(priceBeforeTax - priceAfterTax);
          const len = item.sku.length;
          //const parentLine = buildBaseDetail({
            
            if(len >= 11 || baseSku === 'PAK001' || baseSku === 'PAK002'){
              try {
              const res = await fetchWithRetry(
              `https://eclatduteint.vn/webhook/ComboMisa?madonhang=${order.orderId}` 
                
                );
                  } catch (error) {
              console.error("Lỗi sync data từ webhook:", error);
              }
              };
                
            //refId,
            //misaProduct: parentProduct,
            //stock,
            //accountMappingId,
            //sortOrder: index * 10 + 1,
            //quantity: item.qty,
            //amount: priceAfterTax * item.qty,
            //priceBeforeTax,
            //priceAfterTax,
            //vatRate: taxRate,
            //vatAmount: vatAmount * item.qty,
            //inventoryItemCode: parentProduct.inventory_item_code,
            //inventoryItemName:
              //priceAfterTax === 0
                //? childProduct.inventory_item_name +" Sản phẩm combo và thông tin hàng ở dòng dưới"+
                  //" (Hàng khuyến mãi không thu tiền)"
                //: childProduct.inventory_item_name,
            //isDescription: false,
            //inventory_item_type: 4,
          //});

          const childLine = buildBaseDetail({
            refId,
            misaProduct: childProduct,
            stock,
            accountMappingId,
            sortOrder: index * 10 + 1,
            quantity: realQty,
            amount: round(priceAfterTax / (realQty/item.qty)) * realQty,
            priceBeforeTax: round(priceBeforeTax / (realQty/item.qty)),
            priceAfterTax: round(priceAfterTax / (realQty/item.qty)),
            vatRate: taxRate,
            vatAmount: vatAmount * item.qty,
            inventoryItemCode: childProduct.inventory_item_code,
            inventoryItemName:
              priceAfterTax === 0
                ? childProduct.inventory_item_name +
                  " (Hàng khuyến mãi không thu tiền)"
                : childProduct.inventory_item_name,
            isDescription: false,
            inventoryitemid:childProduct.inventory_item_id,
            unitid: childProduct.unit_id,
            unitname: childProduct.unit_name,
          });
          // ======================
          // Bỏ cmt dòng này nếu muốn debug
          // console.log({ parentLine, childLine });
          //return [parentLine, childLine];
          return [childLine];
        })
      )
    ).flat();

    // Bỏ comment đoạn này nếu muốn debug null field
    // detail.forEach((d, i) => {
    //   const nullFields = findNullFields(d);

    //   if (nullFields.length > 0) {
    //     console.error("❌ DETAIL NULL FIELD");
    //     console.error("Index:", i);
    //     console.error("SKU:", d.inventory_item_code);
    //     console.error("Null fields:", nullFields);
    //     console.error("FULL OBJECT:", d);
    //   }
    // });

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

      account_object_id: accountMappingId,
      account_object_address: order.address,
      account_object_name: order.customerName,
      account_object_code: accountMappingCode,

      refdate: order.createdAt,

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

function buildBaseDetail({
  refId,
  misaProduct,
  stock,
  accountMappingId,
  sortOrder,
  quantity,
  amount,
  priceBeforeTax,
  priceAfterTax,
  vatRate,
  vatAmount,
  inventoryItemCode,
  inventoryItemName,
  isDescription,
  inventoryitemid,
  unitid,
  unitname,
}) {
  return {
    ref_detail_id: crypto.randomUUID(),
    refid: refId,
    org_refid: refId,

    inventory_item_id: inventoryitemid,
    inventory_item_code: inventoryItemCode,
    inventory_item_name: inventoryItemName,
    inventory_item_type: 0,

    stock_id: 'ff877de8-f572-4c7f-943d-3be84897209a',
    stock_code: 'KHO_CHAN_HUNG',
    stock_name: 'KHO CHẤN HƯNG',

    unit_id: unitid,
    unit_name: unitname,

    account_object_id: accountMappingId,
    sort_order: sortOrder,

    quantity,
    amount,
    amount_oc: amount,

    discount_rate: null,

    main_quantity: quantity,
    main_convert_rate: null,
    main_unit_id: unitid,
    main_unit_name: unitname,
    main_unit_price: priceBeforeTax,

    vat_rate: vatRate,
    vat_amount: vatAmount,
    vat_amount_oc: vatAmount,

    description: inventoryItemName,

    exchange_rate_operator: "*",
    unit_price: priceAfterTax,

    is_promotion: false,
    is_unit_price_after_tax: false,

    quantity_delivered: 0,
    quantity_remain: 0,
    is_description: isDescription,

    discount_type: 1,
    discount_rate_voucher: 0,
    state: 1,
    status: 0,
  };
}

module.exports = {
  connectAmisMisa,
  postMisaDataService,
  postSaleDocumentMisaService,
  deleteMisaDataService,
};
