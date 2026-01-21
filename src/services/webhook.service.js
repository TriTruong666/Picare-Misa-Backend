const { default: axios } = require("axios");
const MisaCombo = require("../models/misa_combo.model");
const { fetchWithRetry } = require("../utils/utils");

async function syncComboFromWebhook() {
  try {
    const res = await fetchWithRetry(
      `https://eclatduteint.vn/webhook/getcombo`
    );
    for (const item of res.data) {
      await MisaCombo.upsert({
        rowNumber: item.row_number,
        maCombo: item.macombo,
        quantity: item.quantity,
        inventoryItemCode: item.inventory_item_code,
      });
      console.log(`Đã đồng bộ combo mã ${item.macombo} thành công từ webhook`);
    }
  } catch (error) {
    console.error("Lỗi sync data từ webhook:", error);
  }
}

module.exports = { syncComboFromWebhook };
