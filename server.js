require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const sequelize = require("./src/config/sequelize");
const userRoutes = require("./src/routes/user.route");
const orderRoutes = require("./src/routes/order.route");
const adminSeed = require("./src/seeds/adminSeed");

const app = express();

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true, // cho phép gửi cookie
  })
);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);

// Start server
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Đã kết nối với SQL Server thông qua Sequelize");

    await sequelize.sync();
    console.log("Tất cả Models đã được đồng bộ hoá");

    await adminSeed(); // seed sau khi sync

    const PORT = process.env.SERVER_PORT || 8686;
    app.listen(PORT, () => {
      console.log(`🚀 Server đang khởi chạy tại cổng ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Không thể kết nối tới DB:", err);
    process.exit(1);
  }
})();
