const express = require("express");
const { body, validationResult } = require("express-validator");
const UserController = require("../controllers/user.controller");
const router = express.Router();

router.get("/", UserController.getUsers);
router.get("/:userId", UserController.getUser);
router.post(
  "/",
  [
    body("name").notEmpty().withMessage("Tên không được để trống"),
    body("email").isEmail().withMessage("Email không hợp lệ"),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Mật khẩu tối thiểu 8 ký tự"),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(200).json({ errors: errors.array() });
    }
    next();
  },
  UserController.createUser
);

module.exports = router;
