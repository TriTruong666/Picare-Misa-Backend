const fs = require("fs");
const path = require("path");
const User = require("../models/user.model");

async function seedingUsers() {
  try {
    const filePath = path.join(__dirname, "../../seeding.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const users = JSON.parse(rawData);

    for (const u of users) {
      const isExisted = await User.findOne({ where: { email: u.email } });

      if (!isExisted) {
        await User.create({
          name: u.name,
          role: u.role,
          email: u.email,
          password: u.password,
        });
        console.log(`User ${u.email} đã được tạo thành công`);
      } else {
        console.log(`User ${u.email} đã tồn tại`);
      }
    }
  } catch (error) {
    console.error(" Lỗi khi seed users:", error.message);
  }
}

module.exports = seedingUsers;
