const ActivityLog = require("../models/activity_log.model");
const User = require("../models/user.model");

class ActivityLogController {
  static async logActivity(req, res) {
    try {
      const { type, userId, note } = req.body;

      // Lấy IP của client
      let ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.connection.remoteAddress;

      if (ip === "::1") {
        ip = "127.0.0.1";
      }

      if (ip && ip.startsWith("::ffff:")) {
        ip = ip.replace("::ffff:", "");
      }

      let username = null;

      // Nếu có userId thì tìm user
      if (userId) {
        const user = await User.findOne({ where: { userId } });

        if (!user) {
          return res.status(404).json({
            message: "Không tìm thấy người dùng này",
          });
        }

        username = user.name;
      }

      // Tạo log
      await ActivityLog.create({
        userId: userId || null,
        name: username,
        type,
        note: type === "try-login" ? `${ip}` : note,
      });

      return res.status(201).json({
        message: "Ghi log thành công",
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({
        message: "Lỗi server",
        error: err.message,
      });
    }
  }

  static async getActivities(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows } = await ActivityLog.findAndCountAll({
        limit: Number(limit),
        offset,
        order: [["createdAt", "DESC"]],
      });

      res.json({
        count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        data: rows,
      });
    } catch (err) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = { ActivityLogController };
