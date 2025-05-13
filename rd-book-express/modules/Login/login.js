const express = require("express");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");
const router = express.Router();
const bcryptjs = require("bcryptjs");
const { validateParams } = require("../../utils/global");

router.post("/login", (req, res) => {
  try {
    const result = validateParams(req.body, ["account", "password"]);
    if (result.isValid) {
      const { account, password } = req.body;
      userCls
        .findOne({ account })
        .then((user) => {
          if (user) {
            bcryptjs.compare(password, user.password, (err, isMatch) => {
              if (err) {
                return errorRes(res, "密码验证失败", 500, 50001);
              }
              if (isMatch) {
                // 删除密码字段
                const userWithoutPassword = { ...user._doc };
                delete userWithoutPassword.password;
                successRes(res, "登录成功", 200, 20000, userWithoutPassword);
              } else {
                failRes(res, "账号或密码错误", 400, 40001);
              }
            });
          } else {
            failRes(res, "账号或密码错误", 400, 40001);
          }
        })
        .catch((err) => {
          errorRes(res, "服务器内部错误", 500, 50000);
        });
    } else {
      failRes(res, result.message, 400, 40000);
    }
  } catch (error) {
    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;
