const express = require("express");
const router = express.Router();
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");

router.post("/attentionSomeBody", async (req, res) => {
  try {
    const result = validateParams(req.body, ["userId", "attentionId"]);
    if (result.isValid) {
      const { userId, attentionId } = req.body;
      if (userId === attentionId) {
        return failRes(res, "不能关注自己", 401, 40100);
      }
      const data1 = await userCls.findById(userId);
      const data2 = await userCls.findById(attentionId);
      if (!data1 || !data2) {
        return failRes(res, "用户不存在", 404, 40400);
      }
      if (!data1.attention.includes(attentionId)) {
        if (!data2.fans.includes(userId)) {
          data1.attention.push(attentionId);
          await data1.save();
          data2.fans.push({ userId, timestamp: new Date() });
          await data2.save();
          successRes(res, "关注成功", 200, 20000, {
            attention: data1.attention,
          });
        } else {
          failRes(res, "您已关注过该用户", 401, 40100);
        }
      } else {
        failRes(res, "您已关注过该用户", 401, 40100);
      }
    } else {
      failRes(res, result.message, 400, 40000);
    }
  } catch (error) {
    errorRes(res, "服务器错误", 500, 50000);
  }
});

router.post("/cancelAttentionSomeBody", async (req, res) => {
  try {
    const result = validateParams(req.body, ["userId", "attentionId"]);
    if (result.isValid) {
      const { userId, attentionId } = req.body;
      const data1 = await userCls.findById(userId);
      const data2 = await userCls.findById(attentionId);

      if (!data1 || !data2) {
        return failRes(res, "用户不存在", 404, 40400);
      }

      // 转换为字符串比较
      const attentionIndex = data1.attention.findIndex(id =>
        id.toString() === attentionId.toString()
      );

      if (attentionIndex !== -1) {
        data1.attention.splice(attentionIndex, 1);

        // 正确查找粉丝记录
        const fanIndex = data2.fans.findIndex(f =>
          f.userId.toString() === userId.toString()
        );

        if (fanIndex !== -1) {
          data2.fans.splice(fanIndex, 1);
          await data1.save();
          await data2.save();
          return successRes(res, "取消关注成功", 200, 20000, {
            attention: data1.attention
          });
        } else {
          return failRes(res, "粉丝记录异常", 400, 40001);
        }
      } else {
        return failRes(res, "您还未关注该用户", 400, 40001);
      }
    } else {
      return failRes(res, result.message, 400, 40000);
    }
  } catch (error) {
    console.error("取消关注错误:", error);
    return errorRes(res, "服务器错误", 500, 50000);
  }
});

router.get("/getAttentionArr", (req, res) => {
  try {
    const result = validateParams(req.query, ["userId"]);
    if (result.isValid) {
      const { userId } = req.query;
      userCls
        .findById(userId)
        .then((data) => {
          if (data) {
            successRes(res, "获取成功", 200, 20000, {
              attentionArr: data.attention,
            });
          } else {
            successRes(res, "获取成功", 200, 20000, { attentionArr: [] });
          }
        })
        .catch((err) => {
          errorRes(res, "服务器内部错误", 500, 500);
        });
    } else {
      failRes(res, result.message, 400, 40000);
    }
  } catch (error) {
    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;
