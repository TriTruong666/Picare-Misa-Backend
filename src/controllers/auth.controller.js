const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

class AuthController {
  static async login(req, res) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ where: { email } });
      if (!user) {
        return res
          .status(401)
          .json({ message: "Sai email hoặc mật khẩu, vui lòng thử lại" });
      }

      const isMatched = await user.comparePassword(password);
      if (!isMatched) {
        return res
          .status(200)
          .json({ message: "Sai email hoặc mật khẩu, vui lòng thử lại" });
      }

      const token = jwt.sign(
        {
          userId: user.userId,
          role: user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "24h",
        }
      );

      res.cookie("token", token, {
        httpOnly: true, // không cho JS truy cập
        secure: process.env.NODE_ENV === "production", // chỉ bật secure khi deploy HTTPS
        sameSite: "strict",
        maxAge: 60 * 60 * 1000 * 24,
      });

      res.json({
        message: "Đăng nhập thành công",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  static async logout(req, res) {
    try {
      res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      res.json({
        message: "Đăng xuất thành công",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = AuthController;
