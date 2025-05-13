const express = require("express");
const router = express.Router();
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const { validateParams } = require("../../utils/global");
const userCls = require("../../models/register");

// modules/personalCenter/getPersonalInfo.js
router.post("/getPersonalInfo", (req, res) => {
  try {
    const result = validateParams(req.body, ["userId"]);
    if (!result.isValid) return failRes(res, result.message, 400, 40000);

    userCls.findOne({ _id: req.body.userId })
      .select('-password') // 排除密码字段
      .lean() // 转换为纯JS对象
      .then(userData => {
        if (!userData) return failRes(res, "用户不存在", 404, 40400);

        successRes(res, "获取成功", 200, 20000, {
          id: userData._id,
          role: userData.role,
          avatar: userData.avatar,
          account: userData.account,
          age: userData.age,
          birthDay: userData.birthDay,
          gender: userData.gender,
          attention: userData.attention,
          fans: userData.fans,
          likedAndCollect: userData.likedAndCollect,
          canComment: userData.canComment // 新增禁言状态
        });
      })
      .catch(err => {
        console.error("查询失败:", err);
        errorRes(res, "服务器内部错误", 500, 50000);
      });
  } catch (error) {
    console.error("系统错误:", error);
    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;
