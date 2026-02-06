require("dotenv").config();
require("./src/data/cron");
const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const sequelize = require("./src/config/sequelize");
const userRoutes = require("./src/routes/user.route");
const orderRoutes = require("./src/routes/order.route");
const authRoutes = require("./src/routes/auth.route");
const analyticsRoutes = require("./src/routes/analytics.route");
const misaRoutes = require("./src/routes/misa.route");
const attendanceRoutes = require("./src/routes/attendance.route");
const activityLogRoutes = require("./src/routes/activity_log.route");
const { sseHandler } = require("./src/config/sse");
const seedingUsers = require("./src/seeds/userSeed");
const { initialMisaConnection } = require("./src/controllers/misa.controller");
const misaSeed = require("./src/seeds/misaSeed");
const { syncComboFromWebhook } = require("./src/services/webhook.service");

const app = express();

// Middleware
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());
app.use(
  cors({
    origin: [process.env.CLIENT_URL, process.env.TEST_CLIENT_URL],
    credentials: true,
  })
);

// Routes
app.get("/api/events", sseHandler);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/activity", activityLogRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/misa", misaRoutes);
// Start server
(async () => {
  try {
    await sequelize.authenticate();
    console.log("Đã kết nối với Postgres thông qua Sequelize");

    //await sequelize.sync({ force: true });
    await sequelize.sync({ });

    console.log("Tất cả Models đã được đồng bộ hoá");

    await seedingUsers();
    await initialMisaConnection();
    await misaSeed();
    await syncComboFromWebhook();

    const PORT = process.env.SERVER_PORT || 8686;
    app.listen(PORT, () => {
      console.log(`Server Picare đang khởi chạy tại cổng ${PORT}`);
    });
  } catch (err) {
    console.error("Không thể kết nối tới DB:", err);
    process.exit(1);
  }
})();
