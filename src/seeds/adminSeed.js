const User = require("../models/user.model");

async function seedingAdminUser() {
  const adminEmail = "admin@gmail.com";
  const adminPass = "admin";

  const isExisted = await User.findOne({ where: { email: adminEmail } });

  if (!isExisted) {
    await User.create({
      name: "Picare Admin",
      role: "admin",
      email: adminEmail,
      password: adminPass,
    });
    console.log("Admin đã được tạo thành công");
  } else {
    console.log("Tài khoản admin đã có rồi");
  }
}

module.exports = seedingAdminUser;
