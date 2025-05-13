const express = require("express");
const router = express.Router();
const Work = require("../../models/firstScreenModel");
const Comment = require("../../models/comment");
const CollectModel=require("../../models/collectModel")
const LikeModel=require("../../models/likeModel")
const UserModel=require("../../models/register")
const { validateParams } = require("../../utils/global");
const { successRes, failRes } = require("../../utils/responseUtil");
const mongoose = require("../../db/mongoose");

// 删除作品接口（POST方法）
router.post("/deleteWork", async (req, res) => {
    try {
        const { workId, authorId } = req.body;

        // 添加 ObjectId 转换
        const authorObjectId = new mongoose.Types.ObjectId(authorId);

        // 获取作品并验证
        const work = await Work.findOneAndDelete({
            _id: workId,
            authorId: authorId // 直接集成权限验证
        })

        if (!work) {
            return failRes(res, "作品不存在或无权操作", 404, 40401);
        }

        // 转换为字符串比较
        if (work.authorId.toString() !== authorId) {
            return failRes(res, "无删除权限", 403, 40301);
        }

        // ====== 新增用户works字段清理 ======
        await UserModel.findByIdAndUpdate(authorId, {
            $pull: { works: workId } 
        });

        // ====== 新增用户统计更新 ======
        await UserModel.findByIdAndUpdate(authorId, {
            $inc: {
                // 根据模型字段结构调整
                likedAndCollect: -(work.likeCount + work.collectCount) // 合并减少
            }
        });

        // ====== 新增关联数据清理 ======
        // 1. 清理收藏记录
        await CollectModel.updateMany(
            { "collects.workId": workId },
            { $pull: { collects: { workId: workId } } } // 移除收藏项
        );

        // 2. 清理点赞记录（假设点赞模型结构类似收藏）
        await LikeModel.updateMany(
            { "likes.workId": workId },
            { $pull: { likes: { workId: workId } } }
        );

        // 更新关联评论（保持与comment.js一致的软删除逻辑）
        const updateResult = await Comment.updateMany(
            { work: workId, isDeleted: false },
            { $set: { isDeleted: true } }
        );

        successRes(res, "作品删除成功", 200, 20000, {
            work: {
                id: work._id,
                title: work.title
            },
            updatedComments: updateResult.nModified,
        });

    } catch (error) {
        console.error("删除失败:", error);
        failRes(res, "删除操作失败", 500, 50001, {
            error: error.message
        });
    }
});

//举报作品
router.post("/reportWork", async (req, res) => {
    try {
        const { workId, reporterId, reason } = req.body;
        // 格式验证（补充校验）
        if (!mongoose.isValidObjectId(workId)) {
            return failRes(res, "评论ID格式错误", 200, 40002);
        }
        if (!mongoose.isValidObjectId(reporterId)) {
            return failRes(res, "举报人ID格式错误", 200, 40003);
        }
        // 验证作品是否存在
        const work = await Work.findById(workId);
        if (!work) return failRes(res, "作品不存在", 200, 40402);

        // 防止重复举报
        const existingReport = work.reports.find(r =>
            r.reporterId.equals(reporterId) 
        );
        if (existingReport) return failRes(res, "重复举报", 200, 40001);

        // 添加举报记录
        const updatedWork = await Work.findByIdAndUpdate(
            workId,
            {
                $push: { reports: { reporterId, reason } },
                $inc: { reportCount: 1 }
            },
            { new: true }
        );

        successRes(res, "举报成功", 200, 20000, {
            reportId: updatedWork.reports.slice(-1)[0]._id
        });

    } catch (error) {
        console.error("举报失败:", error);
        failRes(res, "举报操作失败", 500, 50002);
    }
});

//获取被举报作品的信息
router.get("/reportedWorks", async (req, res) => {
    try {
        const { page = 1, pageSize = 10 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(pageSize);

        const results = await Work.aggregate([
            {
                $match: {
                    reportCount: { $gt: 0 },
                    isApproved: true // 新增审核状态过滤
                }
            },
            { $sort: { reportCount: -1 } },
            { $skip: skip },
            { $limit: parseInt(pageSize) },
        ]);

        successRes(res, "获取成功", 200, 20002, results);
    } catch (error) {
        console.error("获取失败:", error);
        failRes(res, "获取举报信息失败", 500, 50003);
    }
});
module.exports = router;