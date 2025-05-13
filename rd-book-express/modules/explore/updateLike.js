const express = require("express");
const router = express.Router();
const FirstScreen = require("../../models/firstScreenModel");
const FirstScreenLike = require("../../models/likeModel");
const User = require("../../models/register");
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const mongoose = require("mongoose");

// 点赞接口
router.post("/updateLike", async (req, res) => {
  try {
    const result = validateParams(req.body, ["userId", "articleId", "bloggerId"]);
    if (!result.isValid) return failRes(res, result.message, 400, 40000);

    const { userId, articleId, bloggerId } = req.body;

    // 验证ID有效性
    if (!mongoose.isValidObjectId(articleId)) {
      return failRes(res, "无效的文章ID", 400, 40001);
    }

    // 使用Promise.all优化查询
    let [work, userLikeDoc, blogger] = await Promise.all([
      FirstScreen.findById(articleId),
      FirstScreenLike.findOne({ userId }),
      User.findById(bloggerId)
    ]);

    // 数据校验
    if (!work) return failRes(res, "文章不存在", 404, 40400);
    if (!blogger) return failRes(res, "博主不存在", 404, 40400);

    // 初始化点赞文档
    if (!userLikeDoc) {
      const newLikeDoc = new FirstScreenLike({ userId, likes: [] });
      await newLikeDoc.save();
      userLikeDoc = newLikeDoc;
    }

    // 检查是否已点赞
    const existingLike = userLikeDoc.likes.find(like =>
      like.workId.toString() === articleId
    );

    if (existingLike) {
      return failRes(res, "您已经点过赞了", 400, 40000);
    }

    // 添加新点赞记录
    userLikeDoc.likes.push({
      workId: articleId,
      createdAt: new Date()
    });

    // 更新计数
    work.likeCount += 1;
    blogger.likedAndCollect += 1;

    // 并行保存
    await Promise.all([userLikeDoc.save(), work.save(), blogger.save()]);

    successRes(res, "点赞成功", 200, 20000, {
      likeCount: work.likeCount
    });

  } catch (error) {
    console.error("点赞操作失败:", error);
    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

// 取消点赞接口
router.post("/updateUnLike", async (req, res) => {
  try {
    const { userId, articleId, bloggerId } = req.body;

    // 验证参数有效性
    if (!mongoose.isValidObjectId(articleId)) {
      return failRes(res, "无效的文章ID", 400, 40001);
    }

    const [work, userLikeDoc, blogger] = await Promise.all([
      FirstScreen.findById(articleId),
      FirstScreenLike.findOne({ userId }),
      User.findById(bloggerId)
    ]);

    if (!work) return failRes(res, "文章不存在", 404, 40400);
    if (!userLikeDoc) return failRes(res, "您还未点赞", 400, 40000);
    if (!blogger) return failRes(res, "用户不存在", 404, 40400);

    // 查找点赞记录索引
    const likeIndex = userLikeDoc.likes.findIndex(
      like => like.workId.toString() === articleId
    );

    if (likeIndex === -1) {
      return failRes(res, "您还未点赞", 400, 40000);
    }

    // 移除点赞记录
    userLikeDoc.likes.splice(likeIndex, 1);

    // 更新计数（确保不小于0）
    work.likeCount = Math.max(0, work.likeCount - 1);
    blogger.likedAndCollect = Math.max(0, blogger.likedAndCollect - 1);

    await Promise.all([userLikeDoc.save(), work.save(), blogger.save()]);

    successRes(res, "取消点赞成功", 200, 20000, {
      likeCount: work.likeCount
    });

  } catch (error) {
    console.error("取消点赞失败:", error);
    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

// 获取点赞ID数组
router.get("/getLikesArr", async (req, res) => {
  try {
    const { userId } = req.query;

    const userLikeDoc = await FirstScreenLike.findOne({ userId })
      .select("likes.workId -_id");

    const likesArr = userLikeDoc?.likes.map(like => like.workId) || [];

    successRes(res, "获取成功", 200, 20000, {
      likesArr
    });

  } catch (error) {
    console.error("获取点赞列表失败:", error);
    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

// 获取点赞详细信息
router.get("/getLikeArrInfo", async (req, res) => {
  try {
    const { userId } = req.query;

    const userLikeDoc = await FirstScreenLike.findOne({ userId })
      .populate({
        path: "likes.workId",
        select: "title imagesInfo authorId createdAt",
        model: "FirstScreen"
      });

    if (!userLikeDoc) {
      return successRes(res, "获取成功", 200, 20000, { likeArrInfo: [] });
    }

    // 格式化返回数据
    const formattedData = userLikeDoc.likes.map(like => ({
      workId: like.workId._id,
      title: like.workId.title,
      imagesInfo: like.workId.imagesInfo,
      authorId: like.workId.authorId,
      createdAt: like.createdAt
    }));

    successRes(res, "获取成功", 200, 20000, {
      likeArrInfo: formattedData
    });

  } catch (error) {
    console.error("获取点赞详情失败:", error);
    errorRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;