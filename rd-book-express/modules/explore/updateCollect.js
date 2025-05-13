const express = require("express");
const router = express.Router();
const FirstScreen = require("../../models/firstScreenModel");
const CollectModel = require("../../models/collectModel");
const User = require("../../models/register");
const { validateParams } = require("../../utils/global");
const { successRes, failRes } = require("../../utils/responseUtil");
const mongoose = require("mongoose");

// 收藏作品
router.post("/updateCollect", async (req, res) => {
  try {
    const { userId, articleId, bloggerId } = req.body;

    // 参数校验
    if (!validateParams(req.body, ["userId", "articleId", "bloggerId"]).isValid) {
      return failRes(res, "参数不完整", 400, 40000);
    }
    if (!mongoose.isValidObjectId(articleId)) {
      return failRes(res, "无效的文章ID", 400, 40001);
    }

    let [work, collectDoc, blogger] = await Promise.all([
      FirstScreen.findById(articleId),
      CollectModel.findOne({ userId }),
      User.findById(bloggerId)
    ]);

    if (!work) return failRes(res, "作品不存在", 404, 40400);
    if (!blogger) return failRes(res, "博主不存在", 404, 40401);

    // 初始化收藏记录
    if (!collectDoc) {
      const newCollect = new CollectModel({
        userId,
        collects: []
      });
      await newCollect.save();
      collectDoc = newCollect;
    }

    // 检查是否已收藏
    const existingCollect = collectDoc.collects.find(
      item => item.workId.toString() === articleId
    );

    if (existingCollect) {
      return failRes(res, "您已经收藏过了", 400, 40000);
    }

    // 添加收藏记录
    collectDoc.collects.push({
      workId: articleId,
      createdAt: new Date()
    });

    // 更新计数
    work.collectCount += 1;
    blogger.likedAndCollect += 1;

    await Promise.all([collectDoc.save(), work.save(), blogger.save()]);

    successRes(res, "收藏成功", 200, 20000, {
      collectCount: work.collectCount
    });

  } catch (error) {
    console.error("收藏操作失败:", error);
    failRes(res, "服务器内部错误", 500, 50000);
  }
});

// 取消收藏
router.post("/updateUnCollect", async (req, res) => {
  try {
    const { userId, articleId, bloggerId } = req.body;

    // 参数校验
    if (!mongoose.isValidObjectId(articleId)) {
      return failRes(res, "无效的文章ID", 400, 40001);
    }

    let [work, collectDoc, blogger] = await Promise.all([
      FirstScreen.findById(articleId),
      CollectModel.findOne({ userId }),
      User.findById(bloggerId)
    ]);

    if (!work) return failRes(res, "作品不存在", 404, 40400);
    if (!collectDoc) return failRes(res, "您还未收藏", 400, 40000);
    if (!blogger) return failRes(res, "用户不存在", 404, 40401);

    // 查找收藏记录索引
    const collectIndex = collectDoc.collects.findIndex(
      item => item.workId.toString() === articleId
    );

    if (collectIndex === -1) {
      return failRes(res, "您还未收藏", 400, 40000);
    }

    // 移除收藏记录
    collectDoc.collects.splice(collectIndex, 1);

    // 更新计数（确保不小于0）
    work.collectCount = Math.max(0, work.collectCount - 1);
    blogger.likedAndCollect = Math.max(0, blogger.likedAndCollect - 1);

    await Promise.all([collectDoc.save(), work.save(), blogger.save()]);

    successRes(res, "取消收藏成功", 200, 20000, {
      collectCount: work.collectCount
    });

  } catch (error) {
    console.error("取消收藏失败:", error);
    failRes(res, "服务器内部错误", 500, 50000);
  }
});

// 获取收藏ID列表
router.get("/getcollectArr", async (req, res) => {
  try {
    const { userId } = req.query;
    const collectDoc = await CollectModel.findOne({ userId })
      .select("collects.workId -_id");

    const collectIds = collectDoc?.collects.map(i => i.workId) || [];

    successRes(res, "获取成功", 200, 20000, {
      collectArr: collectIds
    });

  } catch (error) {
    console.error("获取收藏列表失败:", error);
    failRes(res, "服务器内部错误", 500, 50000);
  }
});

// 获取收藏作品详情
router.get("/getCollectArrInfo", async (req, res) => {
  try {
    const { userId } = req.query;
    const collectDoc = await CollectModel.findOne({ userId })
      .populate({
        path: "collects.workId",
        model: "FirstScreen",
        select: "title imagesInfo authorId account avatar createTime collectCount likeCount"
      });

    if (!collectDoc) {
      return successRes(res, "暂无收藏", 200, 20000, { collectUserInfo: [] });
    }

    // 按收藏时间倒序
    const sortedCollects = collectDoc.collects.sort(
      (a, b) => b.createdAt - a.createdAt
    );

    successRes(res, "获取成功", 200, 20000, {
      collectUserInfo: sortedCollects.map(item => ({
        ...item.workId.toObject(),
        collectedAt: item.createdAt
      }))
    });

  } catch (error) {
    console.error("获取收藏详情失败:", error);
    failRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;