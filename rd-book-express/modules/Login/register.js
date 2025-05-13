const express = require("express");
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");
const router = express.Router();
const bcryptjs = require("bcryptjs");

router.post("/register", async (req, res) => { // 改为 async/await 方式
  try {
    const result = validateParams(req.body, [
      "account",
      "password",
      "avatar",
      "age",
      "birthDay",
      "gender",
    ]);

    if (!result.isValid) {
      return failRes(res, result.message, 400, 40000);
    }

    const { account, password, avatar, age, birthDay, gender } = req.body;

    // ========== 新增用户名查重逻辑 ==========
    const existingUser = await userCls.findOne({ account });
    if (existingUser) {
      return failRes(res, "用户名已存在", 200, 40001); // 新错误码
    }

    const hashedPassword = await bcryptjs.hash(password, 10);

    const newUser = new userCls({
      avatar,
      account,
      password: hashedPassword,
      age,
      birthDay,
      gender,
      attention: [],
      fans: [],
      likedAndCollect: 0,
    });

    await newUser.save();
    successRes(res, "注册成功", 200, 20000, {});

  } catch (error) {
    // ========== 处理唯一索引冲突 ==========
    if (error.code === 11000 && error.keyPattern?.account) {
      return failRes(res, "用户名已被占用", 200, 40001);
    }
    console.error("注册错误:", error);
    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;
