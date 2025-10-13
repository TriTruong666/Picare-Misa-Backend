const AttendanceServer = require("../models/attendance_server.model");
const AttendanceUser = require("../models/attendance_user.model");
const { getAttendanceLogs } = require("../services/hik.service");

class AttendanceController {
  static async createAttendanceServer(req, res) {
    try {
      const { serverName, domain, username, password } = req.body;
      await AttendanceServer.create({ serverName, domain, username, password });
      res.json({
        message: "Tạo máy chủ chấm công thành công",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  static async getAllAttendanceServer(req, res) {
    try {
      const servers = await AttendanceServer.findAll({
        attributes: { exclude: ["username", "password", "domain"] },
      });
      res.json(servers);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getAttendanceEmployeeDataByServer(req, res) {
    try {
      const { serverId } = req.query;
      if (!serverId) {
        return res.json({
          message: "Vui lòng chọn máy chủ để lấy dữ liệu",
        });
      }
      const server = await AttendanceServer.findOne({
        where: { serverId: serverId },
        include: [
          {
            model: AttendanceUser,
            as: "attendance_data",
            attributes: ["empId", "empName", "checkinTime"],
          },
        ],
      });
      if (!server) {
        return res.json({
          message: "Không tìm thấy máy chủ này",
        });
      }

      res.json({
        serverName: server.serverName,
        attendance_data: server.attendance_data,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getAttendanceEmployeeData(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const { count, rows } = await AttendanceUser.findAndCountAll({
        limit: Number(limit),
        offset,
        order: [["checkinTime", "DESC"]],
        include: [
          {
            model: AttendanceServer,
            as: "server",
            attributes: ["serverName"],
          },
        ],
        attributes: { exclude: ["serverId"] },
      });
      res.json({
        count,
        page: Number(page),
        totalPages: Math.ceil(count / Number(limit)),
        attendance: rows,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  static async syncAttendanceData(req, res) {
    try {
      const { serverId } = req.body;
      const { type } = req.query;
      if (type === "single") {
        if (!serverId) {
          return res.json({
            message: "Vui lòng chọn máy chủ để đồng bộ",
          });
        }
        const result = await syncAttendanceEmployee(serverId);
        return res.json(result);
      } else if (type === "all") {
        const result = await syncAttendanceEmployeeAll();
        return res.json(result);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

async function syncAttendanceEmployee(serverId) {
  const server = await AttendanceServer.findOne({
    where: { serverId: serverId },
  });
  if (!server) {
    return { message: "Không tìm thấy máy chủ nào" };
  }

  const requestUrl = server.domain;
  const requestUsername = server.username;
  const requestPassword = server.password;

  const data = await getAttendanceLogs(
    requestUsername,
    requestPassword,
    requestUrl
  );
  const attendance_users = data?.InfoList || [];

  for (const user of attendance_users) {
    try {
      await AttendanceUser.upsert({
        empId: user.employeeNoString,
        empName: user.name,
        checkinTime: user.time,
        serverId: server.serverId,
      });
      console.log(`Đã lưu log của ${user.name}`);
    } catch (err) {
      console.log("❌ Validation failed for", user.employeeNoString);
      console.log(err.errors?.map((e) => `${e.path}: ${e.message}`));
    }
  }

  return { message: `Đã đồng bộ xong dữ liệu từ máy chủ ${server.serverName}` };
}

async function syncAttendanceEmployeeAll() {
  const servers = await AttendanceServer.findAll();
  if (servers.length === 0) {
    return { message: "Không có máy chủ nào để đồng bộ" };
  }
  const results = [];

  for (const server of servers) {
    try {
      const result = await syncAttendanceEmployee(server.serverId);
      results.push({ server: server.serverName, message: result.message });
    } catch (err) {
      console.error(
        `❌ Lỗi khi đồng bộ server ${server.serverName}:`,
        err.message
      );
      results.push({
        server: server.serverName,
        message: err.message,
      });
    }
  }
  return { message: "Đã đồng bộ tất cả dữ liệu chấm công thành công", results };
}

module.exports = {
  AttendanceController,
  syncAttendanceEmployee,
  syncAttendanceEmployeeAll,
};
