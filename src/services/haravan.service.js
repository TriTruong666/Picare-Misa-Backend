const axios = require("axios");

async function fetchHaravanOrders(page = 1, limit = 50) {
  try {
    const { created_at_max, created_at_min } = getLastDaysRangeVN();
    const res = await axios.get(process.env.HARAVAN_PICARE_API_URL, {
      headers: {
        Authorization: `Bearer ${process.env.HARAVAN_PICARE_TOKEN}`,
        "Content-Type": "application/json",
      },
      params: {
        page: page,
        limit: limit,
        created_at_min: created_at_min,
        created_at_max: created_at_max,
      },
    });
    return res.data.orders || [];
  } catch (err) {
    console.error(` Lỗi khi fetch page ${page}:`, err.message);
    return [];
  }
}

function getLastDaysRangeVN() {
  const now = new Date();

  const max = new Date(now);
  const min = new Date(now);

  min.setDate(now.getDate() - 9);

  const created_at_min = new Date(
    min.getTime() - min.getTimezoneOffset() * 60000
  ).toISOString();
  const created_at_max = new Date(
    max.getTime() - max.getTimezoneOffset() * 60000
  ).toISOString();

  return { created_at_min, created_at_max };
}

async function countOrdersLastWeek() {
  try {
    const { created_at_max, created_at_min } = getLastDaysRangeVN();
    const res = await axios.get(process.env.HARAVAN_PICARE_COUNT_API_URL, {
      headers: {
        Authorization: `Bearer ${process.env.HARAVAN_PICARE_TOKEN}`,
        "Content-Type": "application/json",
      },
      params: {
        created_at_min: created_at_min,
        created_at_max: created_at_max,
      },
    });
    return res.data.count;
  } catch (err) {
    console.error(` Lỗi khi count:`, err.message);
  }
}

async function fetchAllHaravanOrders(limit = 50) {
  try {
    // B1: lấy tổng số đơn
    const total = await countOrdersLastWeek();
    const totalPages = Math.ceil(total / limit);

    console.log(`📦 Tổng ${total} đơn hàng, chia thành ${totalPages} trang`);

    let allOrders = [];

    // B2: loop qua từng page
    for (let page = 1; page <= totalPages; page++) {
      console.log(`➡️ Fetch trang ${page}/${totalPages}`);
      const orders = await fetchHaravanOrders(page, limit);
      allOrders = allOrders.concat(orders);
    }

    return allOrders;
  } catch (err) {
    console.error(" Lỗi khi fetchAllHaravanOrders:", err.message);
    return [];
  }
}

module.exports = {
  fetchHaravanOrders,
  countOrdersLastWeek,
  fetchAllHaravanOrders,
};
