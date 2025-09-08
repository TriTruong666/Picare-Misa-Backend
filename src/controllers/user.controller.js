const User = require("../models/user.model");

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
