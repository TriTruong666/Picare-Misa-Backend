const axios = require("axios");

async function fetchHaravanOrders(
  page = 1,
  limit = 50,
  processedAt = "last_week"
) {
  try {
    const res = await axios.get(process.env.HARAVAN_API_URL, {
      headers: {
        Authorization: `Bearer ${process.env.HARAVAN_TOKEN}`,
        "Content-Type": "application/json",
      },
      params: {
        page: page,
        limit: limit,
        processed_at: processedAt,
      },
    });
    return res.data.orders || [];
  } catch (err) {
    console.error(`❌ Lỗi khi fetch page ${page}:`, err.message);
    return [];
  }
}

function getLast7DaysRangeVN() {
  const now = new Date();

  const max = new Date(now);
  const min = new Date(now);

  min.setDate(now.getDate() - 7);

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
    const { created_at_max, created_at_min } = getLast7DaysRangeVN();
    const res = await axios.get(process.env.HARAVAN_COUNT_API_URL, {
      headers: {
        Authorization: `Bearer ${process.env.HARAVAN_TOKEN}`,
        "Content-Type": "application/json",
      },
      params: {
        created_at_min: created_at_min,
        created_at_max: created_at_max,
      },
    });
    return res.data.count;
  } catch (err) {
    console.error(`❌ Lỗi khi count:`, err.message);
  }
}

module.exports = { fetchHaravanOrders, countOrdersLastWeek };
