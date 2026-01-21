const { default: axios } = require("axios");

async function fetchWithRetry(url, retries = 3, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await axios.get(url, { timeout: 5000 });
    } catch (err) {
      if (i === retries) throw err;
      console.warn(`Đang thử lại lần ${i}/${retries}...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseComboSku(sku) {
  const [baseSku, suffix] = sku.split("-");
  return {
    isCombo: Boolean(suffix),
    baseSku,
    multiplier: suffix ? Number(suffix) : 1,
  };
}

function findNullFields(obj) {
  return Object.entries(obj)
    .filter(([_, v]) => v === null || v === undefined)
    .map(([k]) => k);
}

module.exports = { fetchWithRetry, delay, parseComboSku, findNullFields };
