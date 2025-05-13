const express = require("express");
const router = express.Router();
const firstScreenSchema = require("../../models/firstScreenModel");
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const { create } = require("../../models/register");
const mongoose = require("../../db/mongoose");

//获取首页作品
router.get("/getFirstScreen", async (req, res) => {
  try {
    const curPage = parseInt(req.query.curPage) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (curPage - 1) * pageSize;
    const data = await firstScreenSchema
      .find({
        isApproved: true,
        isDraft: false })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .exec();
    const total = await firstScreenSchema.countDocuments().exec();
    successRes(res, "获取explore数据成功", 200, 20000, {
      data,
      page: curPage,
      pageSize,
      total,
    });
  } catch (err) {
    console.error("获取explore数据失败", err);
    failRes(res, "服务器内部错误", 500, 50000);
  }
});


//获取未审核作品接口
router.get("/getUnapprovedWorks", async (req, res) => {
  try {
    const curPage = parseInt(req.query.curPage) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const skip = (curPage - 1) * pageSize;

    const data = await firstScreenSchema
      .find({ isApproved: false })
      .sort({ _id: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await firstScreenSchema.countDocuments({
      isApproved: false, isDraft: false  });

    successRes(res, "获取未审核作品成功", 200, 20000, {
      data: data.map(item => ({
        ...item,
        isApproved: item.isApproved // 包含审核状态
      })),
      page: curPage,
      pageSize,
      total,
    });
  } catch (err) {
    console.error("获取未审核作品失败", err);
    failRes(res, "服务器内部错误", 500, 50000);
  }
});

//新增审核状态接口
router.put("/updateApprovalStatus", async (req, res) => {
  try {
    const { workId, isApproved } = req.body;

    // 参数校验
    if (!mongoose.Types.ObjectId.isValid(workId)) {
      return failRes(res, "无效的作品ID", 200, 40000);
    }
    if (typeof isApproved !== "boolean") {
      return failRes(res, "审核状态参数不合法", 200, 40001);
    }

    const updatedWork = await firstScreenSchema.findByIdAndUpdate(
      workId,
      { isApproved },
      { new: true }
    );

    if (!updatedWork) {
      return failRes(res, "作品不存在", 200, 40400);
    }

    successRes(res, "审核状态更新成功", 200, 20000, {
      workId: updatedWork._id,
      isApproved: updatedWork.isApproved
    });
  } catch (error) {
    console.error("审核状态更新失败:", error);
    failRes(res, "服务器内部错误", 500, 50000);
  }
});

module.exports = router;
