const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
class UserController {
  static async getUsers(req, res) {
    try {
      const users = await User.findAll({
        attributes: {
          exclude: ["password", "id"],
        },
      });
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async getMe(req, res) {
    try {
      // lấy token từ cookies
      const token = req.cookies.token;
      if (!token) {
        return res.status(401).json({ message: "Bạn chưa đăng nhập" });
      }

      // verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // lấy user từ DB
      const user = await User.findOne({
        where: { userId: decoded.userId },
        attributes: { exclude: ["password", "id"] },
      });

      if (!user) {
        return res.status(404).json({ message: "Không tìm thấy tài khoản" });
      }

      res.json(user);
    } catch (err) {
      return res
        .status(401)
        .json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }
  }

  static async getUser(req, res) {
    try {
      const user = await User.findByPk(req.params.userId);
      if (!user)
        return res.status(404).json({ message: "Không tìm thấy tài khoản" });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  static async createUser(req, res) {
    try {
      const newUser = await User.create(req.body);
      res.status(201).json(newUser);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = UserController;
