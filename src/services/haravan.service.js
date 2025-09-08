const axios = require("axios");

async function fetchHaravanOrders() {
  try {
    const res = await axios.get(
      `${process.env.HARAVAN_API_URL}?page=1&limit=50&processed_at=last_week`,
      {
        headers: {
          Authorization: `Bearer ${process.env.HARAVAN_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data.orders;
  } catch (error) {
    console.error("❌ Lỗi khi gọi API Haravan:", err.message);
    throw err;
  }
}

module.exports = { fetchHaravanOrders };
