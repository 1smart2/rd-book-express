const express = require("express");
const { validateParams } = require("../../utils/global");
const { errorRes, failRes, successRes } = require("../../utils/responseUtil");
const work = require("../../models/firstScreenModel");
const userCls = require("../../models/register");
const router = express.Router();

//发布图文接口
router.post("/publish", async (req, res) => {
  try {
    let avatar, account;
    const result = validateParams(req.body, ["imagesInfo", "authorId"]);
    if (!result.isValid) {
      return failRes(res, result.message, 400, 40000);
    }
    const { title, content, tip, imagesInfo, authorId } = req.body;

    // 获取用户信息
    const user = await userCls.findById(authorId);
    if (!user) {
      return failRes(res, "用户不存在", 404, 40400);
    }
    // 创建新作品
    const newContent = new work({
      title,
      content,
      tip,
      account: user.account,
      avatar: user.avatar,
      imagesInfo,
      authorId,
      collectCount: 0,
      likeCount: 0,
      isApproved: false // 明确设置为未审核状态
    });

    // 保存作品
    const savedWork = await newContent.save();

    // 更新用户作品列表
    await userCls.findByIdAndUpdate(
      authorId,
      { $push: { works: savedWork._id } }
    );

    successRes(res, "发布成功", 201, 20100, {
      workId: savedWork._id
    });

  } catch (error) {
    console.error("发布错误:", error);
    // 如果保存了作品但更新用户失败，进行回滚
    if (newContent?._id) {
      await work.findByIdAndDelete(newContent._id);
    }
    errorRes(res, "发布失败", 500, 50000);
  }
});

// 发布视频接口
router.post("/publishVideo", async (req, res) => {
  try {
    let avatar, account;
    const result = validateParams(req.body, ["imagesInfo", "authorId"]);
    if (!result.isValid) {
      return failRes(res, result.message, 400, 40000);
    }

    console.log(1111,req.body);
      
    const { title, content, tip, imagesInfo, authorId } = req.body;

    // 获取用户信息
    const user = await userCls.findById(authorId);
    if (!user) {
      return failRes(res, "用户不存在", 404, 40400);
    }

    // 创建新作品
    const newContent = new work({
      title,
      content,
      tip,
      account: user.account,
      avatar: user.avatar,
      imagesInfo, 
      authorId,
      collectCount: 0,
      likeCount: 0,
      isApproved: false
    });

    // 保存作品
    const savedWork = await newContent.save();

    // 更新用户作品列表
    await userCls.findByIdAndUpdate(
      authorId,
      { $push: { works: savedWork._id } }
    );

    successRes(res, "视频发布成功", 201, 20100, {
      workId: savedWork._id
    });

  } catch (error) {
    console.error("视频发布错误:", error);
    if (newContent?._id) {
      await work.findByIdAndDelete(newContent._id);
    }
    errorRes(res, "视频发布失败", 500, 50000);
  }
});

// 保存草稿接口（覆盖式保存）
router.post("/publish/draft", async (req, res) => {
  try {
    const { authorId } = req.body;
    if (!authorId) {
      return failRes(res, "缺少authorId参数", 200, 40000);
    }

    const user = await userCls.findById(authorId);
    if (!user) {
      return failRes(res, "用户不存在",200, 40400);
    }
    console.log(123, req.body.imagesInfo);

    // 覆盖式保存：查找并更新现有草稿，不存在则创建
    const draftData = {
      ...req.body,
      account: user.account,
      avatar: user.avatar,
      isDraft: true,
      createdAt: new Date(),
    };

    const updatedDraft = await work.findOneAndUpdate(
      { authorId, isDraft: true },
      draftData,
      { new: true, upsert: true }
    );

    successRes(res, "草稿保存成功", 200, 20000, {
      draftId: updatedDraft._id
    });

  } catch (error) {
    console.error("草稿保存错误:", error);
    errorRes(res, "草稿保存失败", 500, 50000);
  }
});

//返回单个草稿
router.get("/publish/draft", async (req, res) => {
  try {
    const { authorId } = req.query;
    if (!authorId) {
      return failRes(res, "缺少authorId参数", 200, 40000);
    }

    const draft = await work.findOne({
      authorId,
      isDraft: true
    }).select('title content tip imagesInfo').lean();

    if (!draft) {
      return successRes(res, "无草稿内容", 200, 20000, {});
    }

    // 仅返回指定字段
    const responseData = {
      title: draft.title || '',
      content: draft.content || '',
      tip: draft.tip || '',
      imagesInfo: draft.imagesInfo || {}
    };

    successRes(res, "获取草稿成功", 200, 20000, responseData);

  } catch (error) {
    console.error("获取草稿错误:", error);
    errorRes(res, "获取草稿失败", 500, 50000);
  }
});

// 新增删除草稿接口
router.delete("/publish/draft", async (req, res) => {
  try {
    const { authorId } = req.body;

    if (!authorId) {
      return failRes(res, "缺少authorId参数", 200, 40000);
    }

    // 查找并删除用户的草稿
    const result = await work.deleteOne({
      authorId,
      isDraft: true
    });

    if (result.deletedCount === 0) {
      return failRes(res, "草稿不存在", 200, 40400);
    }

    successRes(res, "草稿删除成功", 200, 20000);

  } catch (error) {
    console.error("草稿删除错误:", error);
    errorRes(res, "草稿删除失败", 500, 50000);
  }
});



module.exports = router;
