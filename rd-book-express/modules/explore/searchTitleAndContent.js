const express = require("express");
const router = express.Router();
const { validateParams } = require("../../utils/global");
const FirstScreen = require("../../models/firstScreenModel");
const User = require("../../models/register");
const { errorRes, successRes, failRes } = require("../../utils/responseUtil");

//搜索内容标题和标签
router.post("/searchTitleAndContent", async (req, res) => {
  try {
    const result = validateParams(req.body, [
      "searchData",
      "pageSize",
      "curPage",
    ]);
    if (result.isValid) {
      const { searchData, curPage, pageSize } = req.body;
      const page = parseInt(curPage) || 1; // 获取当前页码，默认为1
      const pageSizeN = parseInt(pageSize) || 10; // 获取每页显示的数量，默认为10
      const total = await FirstScreen.countDocuments({
        $or: [
          { title: { $regex: searchData, $options: "i" } },
          { content: { $regex: searchData, $options: "i" } },
          { tip: { $regex: searchData, $options: "i" } },
        ],
      }).catch((err) => {
        failRes(res, "搜索失败", 400, 40000, err);
      });
      await FirstScreen.find({
        isApproved: true,
        isDraft: false ,
        $or: [
          { title: { $regex: searchData, $options: "i" } },
          { content: { $regex: searchData, $options: "i" } },
          { tip: { $regex: searchData, $options: "i" } },
        ],
      })
        .sort({ createTime: -1 })
        .skip((page - 1) * pageSizeN) // 跳过前面的文档
        .limit(pageSizeN) // 限制返回的文档数量
        .then((data) => {
          successRes(res, "搜索成功", 200, 20000, { data, total });
        })
        .catch((err) => {
          failRes(res, "搜索失败", 400, 40000, err);
        });
    } else {
      failRes(res, result.message, 400, 40000);
    }
  } catch (error) {
    errorRes(res, "服务器错误", 500, 50000);
  }
});

//搜索用户
router.post("/searchUser", async (req, res) => {
  try {
    const result = validateParams(req.body, ["searchData"]);
    if (!result.isValid) return failRes(res, result.message, 400, 40000);

    const { searchData = "", curPage = 1, pageSize = 10 } = req.body;
    const page = Math.max(1, parseInt(curPage));
    const pageSizeN = Math.min(100, Math.max(1, parseInt(pageSize)));

    // 构建搜索条件（根据现有模型字段）
    const searchCondition = {
      account: { $regex: searchData.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: "i" }
    };

    const [total, users] = await Promise.all([
      User.countDocuments(searchCondition),
      User.find(searchCondition)
        .select('avatar account gender fans attention likedAndCollect') // 根据现有字段选择
        .skip((page - 1) * pageSizeN)
        .limit(pageSizeN)
        .lean()
    ]);

    successRes(res, "搜索成功", 200, 20000, {
      data: users.map(user => ({
        authorId: user._id.toString(),
        avatar: user.avatar,
        account: user.account,
        gender: user.gender,
        fansCount: user.fans?.length || 0,  // 计算粉丝数量
        followCount: user.attention?.length || 0,  // 计算关注数量
        likedCollectCount: user.likedAndCollect || 0 // 获赞与收藏数
      })),
      total,
      currentPage: page,
      totalPages: Math.ceil(total / pageSizeN)
    });

  } catch (error) {
    console.error('用户搜索错误:', error);
    errorRes(res, "服务器错误", 500, 50000);
  }
});


module.exports = router;
