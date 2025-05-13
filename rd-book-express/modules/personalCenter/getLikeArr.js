// 修改后的 getLikeArr.js
const express = require("express");
const router = express.Router();
const FirstScreenLike = require("../../models/likeModel");
const { validateParams } = require("../../utils/global");
const { successRes, failRes } = require("../../utils/responseUtil");

router.post("/getLikeArr", async (req, res) => {
  try {
    const { userId, curPage = 1, pageSize = 10 } = req.body;

    // 参数验证
    if (!validateParams(req.body, ["userId"]).isValid) {
      return failRes(res, "用户ID必传", 400, 40000);
    }

    // 获取点赞记录（包含完整作品信息）
    const likeDoc = await FirstScreenLike.findOne({ userId })
      .populate({
        path: "likes.workId",
        model: "FirstScreen",
        select: "-__v -updateTime" // 排除不必要字段
      })
      .lean();

    if (!likeDoc?.likes?.length) {
      return successRes(res, "获取成功", 200, 20000, {
        data: [],
        total: 0
      });
    }

    // 格式化数据（与发布作品接口结构一致）
    const formattedData = likeDoc.likes
    .filter(item => item.workId !== null) // 过滤已删除作品
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ workId }) => ({
      ...workId,
      // 使用安全访问操作符
      _id: workId?._id, 
      createTime: workId?.createTime
    }))
    .filter(item => item._id); // 再次过滤无效数

    // 分页处理
    const page = Number(curPage);
    const size = Number(pageSize);
    const pagedData = formattedData.slice(
      (page - 1) * size,
      page * size
    );

    successRes(res, "获取成功", 200, 20000, {
      data: pagedData,
      total: formattedData.length
    });

  } catch (error) {
    console.error("获取点赞作品失败:", error);
    failRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;