const express = require("express");
const router = express.Router();
const CollectModel = require("../../models/collectModel");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const { validateParams } = require("../../utils/global");
const FirstScreen = require("../../models/firstScreenModel");

router.post("/getCollection", async (req, res) => {
  try {
    const result = validateParams(req.body, ["userId", "pageSize", "curPage"]);
    if (result.isValid) {
      const { userId, curPage, pageSize } = req.body;
      // 使用 populate 方法关联查询收藏的作品信息
      const collectRecord = await CollectModel.findOne({ userId })
        .populate({
          path: "collects.workId",
          model: "FirstScreen",
          select: "-__v -updateTime" // 排除不必要字段
        })
        .lean();

      if (!collectRecord || !collectRecord.collects || collectRecord.collects.length === 0) {
        return successRes(res, "没有收藏记录", 200, 20000, {
          data: [],
          total: 0
        });
      }

      // 按收藏时间倒序排列（利用模型中定义的索引）
      const sortedCollects = collectRecord.collects.sort(
        (a, b) => b.createdAt - a.createdAt
      );

      const pageNumber = parseInt(curPage, 10) || 1;
      const limit = parseInt(pageSize, 10) || 10;

      // 分页处理
      const pagedCollects = sortedCollects.slice(
        (pageNumber - 1) * limit,
        pageNumber * limit
      );

      // 格式化数据，提取作品信息
      const formattedData = pagedCollects.filter(item => item.workId !== null) // 过滤已删除的作品
       .map((item) => ({
        ...item.workId,
        _id: item.workId._id,
        createTime: item.workId.createTime,
        collectTime: item.createdAt // 添加收藏时间
      }));

      return successRes(res, "获取收藏记录成功", 200, 20000, {
        data: formattedData,
        total: sortedCollects.length
      });
    } else {
      return failRes(res, result.message, 400, 40000);
    }
  } catch (error) {
    console.error("获取收藏作品失败:", error);
    return errorRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;