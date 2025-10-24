const AttendanceServer = require("../models/attendance_server.model");
const AttendanceUser = require("../models/attendance_user.model");
const { google } = require("googleapis");
const pLimit = require("p-limit").default;
const path = require("path");
const { getAllAttendanceLogs } = require("../services/hik.service");

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
      const { serverId, page = 1, limit = 20 } = req.query;
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
            attributes: ["empId", "empName", "checkinTime", "type"],
            separate: true,
            order: [["checkinTime", "DESC"]],
            include: {
              model: AttendanceServer,
              as: "server",
              attributes: ["serverName"],
            },
          },
        ],
      });
      if (!server) {
        return res.json({
          message: "Không tìm thấy máy chủ này",
        });
      }

      const pageInt = parseInt(page, 10);
      const limitInt = parseInt(limit, 10);

      const startIndex = (pageInt - 1) * limitInt;
      const endIndex = pageInt * limitInt;

      const paginatedData = server.attendance_data.slice(startIndex, endIndex);

      res.json({
        serverName: server.serverName,
        page: pageInt,
        count: server.attendance_data.length,
        totalPage: Math.ceil(server.attendance_data.length / limitInt),
        attendance_data: paginatedData,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getAttendanceEmployeeData(req, res) {
    try {
      const { page = 1, limit = 20, type } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const where = {};

      if (type) {
        where.type = type;
      }

      const { count, rows } = await AttendanceUser.findAndCountAll({
        where,
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
      const { serverId, minor } = req.body;
      const { type } = req.query;
      if (type === "single") {
        if (!serverId) {
          return res.json({
            message: "Vui lòng chọn máy chủ để đồng bộ",
          });
        }
        const result = await syncAttendanceEmployee(serverId, minor);
        return res.json(result);
      } else if (type === "all") {
        const result = await syncAttendanceEmployeeAll(minor);
        return res.json(result);
      }
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
  static async syncGoogleSheet(req, res) {
    try {
      const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
      await syncAttendanceToSheet(SPREADSHEET_ID);

      res.json({
        message: "Đã đồng bộ lên Google Sheets",
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

async function syncAttendanceEmployee(serverId, type) {
  const server = await AttendanceServer.findOne({
    where: { serverId: serverId },
  });
  if (!server) {
    return { message: "Không tìm thấy máy chủ nào" };
  }

  const requestUrl = server.domain;
  const requestUsername = server.username;
  const requestPassword = server.password;

  const data = await getAllAttendanceLogs(
    requestUsername,
    requestPassword,
    requestUrl,
    type
  );

  for (const user of data) {
    const exists = await AttendanceUser.findOne({
      where: {
        empId: user.employeeNoString,
        checkinTime: user.time,
        serverId: server.serverId,
      },
    });

    if (exists) {
      continue;
    }

    try {
      await AttendanceUser.create({
        empId: user.employeeNoString,
        empName: user.name,
        checkinTime: user.time,
        serverId: server.serverId,
        type: type === 75 ? "face" : "fingerprint",
      });
    } catch (err) {
      console.log("Validation failed for", user.name);
    }
  }

  return { message: `Đã đồng bộ xong dữ liệu từ máy chủ ${server.serverName}` };
}

async function syncAttendanceEmployeeAll(type) {
  const limit = pLimit(5);
  const servers = await AttendanceServer.findAll();
  if (servers.length === 0) {
    return { message: "Không có máy chủ nào để đồng bộ" };
  }

  const resultsPromises = await Promise.all(
    servers.map((server) =>
      limit(async () => {
        const result = await syncAttendanceEmployee(server.serverId, type);
        return { server: server.serverName, message: result.message };
      })
    )
  );
  return {
    message: "Đã đồng bộ tất cả dữ liệu chấm công thành công",
    resultsPromises,
  };
}

const auth = new google.auth.GoogleAuth({
  keyFilename: path.join(__dirname, "../../account-service.json"),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function syncAttendanceToSheet() {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;

    const sheetName = "Chấm công Trung Hạnh";
    const attendanceData = await AttendanceUser.findAll({
      order: [["checkinTime", "DESC"]],
      include: {
        model: AttendanceServer,
        as: "server",
        attributes: ["serverName"],
      },
    });
    if (!attendanceData || attendanceData.length === 0) {
      console.log("No data to sync.");
      return;
    }

    // Chuyển dữ liệu thành mảng 2 chiều để Google Sheets nhận
    const values = attendanceData.map((item) => [
      item.empId,
      item.empName,
      item.checkinTime,
      item.type,
      item.server.serverName,
    ]);

    values.unshift(["Mã nhân viên", "Tên nhân viên", "Thời gian Check-In"]);

    // Ghi dữ liệu vào Sheet, ghi đè toàn bộ nội dung
    const res = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values,
      },
    });

    console.log(
      `✅ Successfully synced ${attendanceData.length} records to sheet "${sheetName}"`
    );
    return res.data;
  } catch (err) {
    console.error("❌ Error syncing to Google Sheet:", err.message || err);
    throw err;
  }
}

module.exports = {
  AttendanceController,
  syncAttendanceEmployee,
  syncAttendanceEmployeeAll,
  syncAttendanceToSheet,
};
