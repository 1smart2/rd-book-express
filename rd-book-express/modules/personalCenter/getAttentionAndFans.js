const express = require("express");
const router = express.Router();
const userCls = require("../../models/register");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const { validateParams } = require("../../utils/global");
const mongoose = require("mongoose");

router.get("/getAttentionUser", (req, res) => {
  try {
    const result = validateParams(req.query, ["userId"]);
    if (result.isValid) {
      const { userId } = req.query;
      if (!mongoose.isValidObjectId(userId)) {
        return failRes(res, "无效的用户ID", 400, 40001);
      }
      userCls
        .findOne({ _id: userId })
        .then((data) => {
          const attentionUserList = data.attention;
          userCls
            .find({ _id: { $in: attentionUserList } })
            .then((data) => {
              successRes(res, "获取成功", 200, 20000, { attentionUser: data });
            })
            .catch((err) => {
              errorRes(res, "服务器内部错误", 500, 500);
            });
        })
        .catch((err) => {
          errorRes(res, "服务器内部错误", 500, 500);
        });
    } else {
      failRes(res, result.message, 400, 40000);
    }
  } catch (error) {
    console.log(error);

    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

router.get("/getFansUser", async (req, res) => {
  try {
    const { userId } = req.query;

    // 参数验证
    if (!mongoose.isValidObjectId(userId)) {
      return failRes(res, "无效的用户ID", 400, 40001);
    }

    // 查询用户并填充粉丝信息（包含必要字段）
    const user = await userCls.findById(userId)
      .populate({
        path: 'fans.userId',
        select: 'account avatar age gender fans attention' // 新增两个字段
      });

    if (!user) return failRes(res, "用户不存在", 404, 40400);

    // 处理粉丝数据（添加统计字段）
    const fansData = user.fans.map(fan => ({
      ...fan.userId.toObject(),
      followedAt: fan.timestamp,
      fansCount: fan.userId.fans?.length || 0,      // 粉丝的粉丝数
      attentionCount: fan.userId.attention?.length || 0 // 粉丝的关注数
    }));

    successRes(res, "获取成功", 200, 20000, { fansUser: fansData });
  } catch (error) {
    console.error("获取粉丝失败:", error);
    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;
