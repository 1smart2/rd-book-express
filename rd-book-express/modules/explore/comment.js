// 新建routes/comment.js
const express = require("express");
const router = express.Router();
const Comment = require("../../models/comment");
const { validateParams } = require("../../utils/global");
const { successRes, failRes } = require("../../utils/responseUtil");
const User = require("../../models/register");
const mongoose = require("mongoose");

// 创建评论
router.post("/createComments", async (req, res) => {
    try {
        // 参数验证使用新字段名
        const result = validateParams(req.body, ["content", "authorId", "articleId"]);
        if (!result.isValid) return failRes(res, result.message, 400, 40000);

        // 创建评论对象时字段映射
        const { content, authorId, articleId } = req.body;
        const comment = new Comment({
            content,
            author: authorId,
            work: articleId
        });

        await comment.save();

        // 填充时需要指定正确字段名
        const populatedComment = await comment.populate({
            path: 'author',
            select: 'account avatar'
        });

        successRes(res, "评论成功", 201, 20000, populatedComment._doc);
    } catch (error) {
        console.error(error);
        failRes(res, "创建评论失败", 500, 50000);
    }
});

// 获取作品评论列表
router.get("/getComments/:articleId", async (req, res) => {
    try {
        // // 新增参数校验
        // const { userId } = req.query;
        // if (!userId) return failRes(res, "用户ID必传", 400, 40001);
        // //获取用户关注列表
        // const user = await User.findById(userId).select('attention');
        // if (!user) return failRes(res, "用户不存在", 404, 40401);

        const comments = await Comment.find({
            work: req.params.articleId,
            isDeleted: false // 添加过滤条件
        })
            .populate('author', 'account avatar')
            .sort('-createdAt')
            .lean(); // 转换为纯JS对象

        successRes(res, "获取成功", 200, 20000, {
            total: comments.length,
            list: comments.map(comment => ({
                id: comment._id,
                content: comment.content,
                author: comment.author,
                createdAt: comment.createdAt
            })),
            // following: user.attention // 使用实际字段名
        });
    } catch (error) {
        console.error("获取评论失败:", error);
        failRes(res, "获取失败", 500, 50000);
    }
});

// 删除评论（软删除）
router.delete("/deleteComments/:commentId", async (req, res) => {
    try {
        const comment = await Comment.findByIdAndUpdate(
            req.params.commentId,
            {
                isDeleted: true,
            },
            { new: true }
        );

        if (!comment) return failRes(res, "评论不存在", 404, 40400);
        successRes(res, "评论已删除", 200, 20000);
    } catch (error) {
        failRes(res, "删除失败", 500, 50000);
    }
});

// 举报评论接口
router.post("/reportComment", async (req, res) => {
    try {
        const { commentId, reporterId, reason } = req.body;

        // 参数校验
        if (!mongoose.isValidObjectId(commentId) || !mongoose.isValidObjectId(reporterId)) {
            return failRes(res, "参数不合法", 200, 40001);
        }

        // 查找评论
        const comment = await Comment.findOne({
            _id: commentId,
            isDeleted: false
        });

        if (!comment) return failRes(res, "评论不存在或已被删除", 200, 40400);

        // 检查是否重复举报
        const alreadyReported = comment.reports.some(r =>
            r.userId.toString() === reporterId.toString()
        );
        if (alreadyReported) {
            return failRes(res, "您已举报过该评论", 200, 40002);
        }

        // 添加举报记录
        comment.reports.push({
            userId: reporterId,
            reason: reason || '其他',
            createdAt: new Date() // 明确添加时间戳
        });
        comment.reportCount += 1;
        comment.lastReportedAt = new Date(); // 新增最后举报时间字段

        await comment.save();

        successRes(res, "举报提交成功", 200, 20000);
    } catch (error) {
        console.error("举报失败:", error);
        failRes(res, "举报失败", 500, 50000);
    }
});

// 后台获取被举报评论接口（优化版）
router.get("/reportedComments", async (req, res) => {
    try {
        const { page = 1, pageSize = 10 } = req.query;
        const query = {
            reportCount: { $gt: 0 },
            isDeleted: false
        };

        const result = await Comment.aggregate([
            { $match: query },
            { $sort: { lastReportedAt: -1 } }, // 按最后举报时间排序
            { $skip: (page - 1) * pageSize },
            { $limit: Number(pageSize) },
            {
                $lookup: {
                    from: "userschemas",
                    localField: "author",
                    foreignField: "_id",
                    as: "authorInfo"
                }
            },
            { $unwind: "$authorInfo" },
            {
                $lookup: {
                    from: "works", // 假设作品集合名为works
                    localField: "work",
                    foreignField: "_id",
                    as: "workInfo"
                }
            },
            { $unwind: { path: "$workInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    reportCount: 1,
                    lastReportedAt: 1,
                    handledStatus: 1, // 新增字段投影
                    workId: "$work",
                    lastReportTime: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M:%S",
                            date: { $arrayElemAt: ["$reports.createdAt", -1] },
                            timezone: "+08:00" // 按需调整时区（这里用北京时间）
                        }
                    }, // 取数组最后一个元素
                    // 被举报用户信息
                    reportedUser: {
                        userId: "$authorInfo._id",
                        account: "$authorInfo.account",
                        avatar: "$authorInfo.avatar"
                    },
                    // 所有举报原因（去重）
                    reportReasons: {
                        $reduce: {
                            input: "$reports.reason",
                            initialValue: [],
                            in: {
                                $concatArrays: [
                                    "$$value",
                                    { $cond: [{ $in: ["$$this", "$$value"] }, [], ["$$this"]] }
                                ]
                            }
                        }
                    },
                    // 作品信息（可选）
                    workTitle: "$workInfo.title"
                }
            }
        ]);

        const total = await Comment.countDocuments(query);
        successRes(res, "获取成功", 200, 20000, {
            total,
            list: result.map(item => ({
             
                comment_id: item._id,
                comment_content: item.content,
                handled_status: item.handledStatus, // 处理状态
                // 将被举报用户信息提升到外层
                reported_userId: item.reportedUser.userId,
                reported_account: item.reportedUser.account,
                reported_avatar: item.reportedUser.avatar,
                reported_count: item.reportCount,
                last_report_time: item.lastReportTime,
                work_id: item.workId,
                reported_reasons: item.reportReasons,
            }))
        });
    } catch (error) {
        console.error("获取失败:", error);
        failRes(res, "获取失败", 500, 50000);
    }
});

//忽略举报评论接口
router.post("/ignoreReport/:commentId", async (req, res) => {
    try {
        const comment = await Comment.findOneAndUpdate(
            {
                _id: req.params.commentId,
                handledStatus: 'pending' // 只处理未处理的
            },
            { handledStatus: 'resolved' },
            { new: true }
        );

        if (!comment) {
            return failRes(res, "评论不存在或已处理", 200, 40401);
        }

        successRes(res, "已标记为已处理", 200, 20000);
    } catch (error) {
        failRes(res, "操作失败", 500, 50000);
    }
});

//禁言评论用户接口
router.post("/banUserComment", async (req, res) => {
    try {
        const { userId } = req.body;
        // 参数校验
        if (!mongoose.isValidObjectId(userId)) {
            return failRes(res, "参数不合法", 400, 40001);
        }

        // 检查用户是否已被禁言
        const existingUser = await User.findById(userId);
        if (!existingUser) return failRes(res, "用户不存在", 404, 40400);
        if (!existingUser.canComment) {
            return failRes(res, "用户已被禁言", 200, 40003);
        }

        // 新增：检查是否存在未处理评论
        const hasUnhandledComments = await Comment.exists({
            author: userId,
            handledStatus: 'pending'
        });

        // 如果所有评论都已处理则禁止操作
        if (!hasUnhandledComments) {
            return failRes(res, "评论已处理", 200, 40005);
        }

        // 执行更新操作（带条件更新）
        const [user, updateResult] = await Promise.all([
            User.findByIdAndUpdate(
                userId,
                { canComment: false },
                { new: true }
            ),
            Comment.updateMany(
                {
                    author: userId,
                    handledStatus: 'pending' // 确保只处理未处理评论
                },
                { handledStatus: 'resolved' }
            )
        ]);

        // 验证实际更新数量
        if (updateResult.modifiedCount === 0) {
            return failRes(res, "没有需要处理的评论", 200, 40006);
        }

        successRes(res, "用户已被禁止评论", 200, 20000);
    } catch (error) {
        failRes(res, "操作失败", 500, 50000);
    }
});

// 解禁评论接口
router.post("/unbanUserComment", async (req, res) => {
    try {
        const { userId } = req.body;
        // 参数校验
        if (!mongoose.isValidObjectId(userId)) {
            return failRes(res, "参数不合法", 400, 40001);
        }

        // 检查用户是否存在
        const existingUser = await User.findById(userId);
        if (!existingUser) return failRes(res, "用户不存在", 404, 40400);

        // 检查是否已解禁
        if (existingUser.canComment) {
            return failRes(res, "用户已拥有评论权限", 200, 40004);
        }

        // 执行解禁操作
        await User.findByIdAndUpdate(
            userId,
            { canComment: true }, // 恢复评论权限
            { new: true }
        );

        successRes(res, "用户评论权限已恢复", 200, 20000);
    } catch (error) {
        failRes(res, "操作失败", 500, 50000);
    }
});

//根据原因模糊搜索举报评论
router.get("/searchReportedComments", async (req, res) => {
    try {
        const { reason, page = 1, pageSize = 10 } = req.query;

        // 参数校验
        if (!reason?.trim()) {
            return failRes(res, "搜索关键词不能为空", 400, 40007);
        }

        const searchRegex = new RegExp(reason.trim(), "i"); // 创建正则表达式对象

        const aggregatePipeline = [
            {
                $match: {
                    "reports.reason": searchRegex,
                    reportCount: { $gt: 0 },
                    isDeleted: false
                }
            },
            { $sort: { lastReportedAt: -1 } },
            { $skip: (page - 1) * pageSize },
            { $limit: Number(pageSize) },
            {
                $lookup: {
                    from: "userschemas",
                    localField: "author",
                    foreignField: "_id",
                    as: "authorInfo"
                }
            },
            { $unwind: "$authorInfo" },
            {
                $lookup: {
                    from: "works",
                    localField: "work",
                    foreignField: "_id",
                    as: "workInfo"
                }
            },
            { $unwind: { path: "$workInfo", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 1,
                    content: 1,
                    reportCount: 1,
                    handledStatus: 1,
                    workId: "$work",
                    lastReportTime: {
                        $dateToString: {
                            format: "%Y-%m-%d %H:%M:%S",
                            date: { $arrayElemAt: ["$reports.createdAt", -1] },
                            timezone: "+08:00"
                        }
                    },
                    reportedUser: {
                        userId: "$authorInfo._id",
                        account: "$authorInfo.account",
                        avatar: "$authorInfo.avatar"
                    },
                    // 修改后的匹配原因处理
                    matchedReasons: {
                        $map: {
                            input: "$reports.reason",
                            as: "r",
                            in: {
                                $cond: [
                                    { $gt: [{ $indexOfCP: ["$$r", reason.trim()] }, -1] },
                                    "$$r",
                                    "$$REMOVE"
                                ]
                            }
                        }
                    },
                    workTitle: "$workInfo.title"
                }
            }
        ];

        const [result, total] = await Promise.all([
            Comment.aggregate(aggregatePipeline),
            Comment.countDocuments({
                "reports.reason": searchRegex,
                reportCount: { $gt: 0 },
                isDeleted: false
            })
        ]);

        successRes(res, "搜索成功", 200, 20000, {
            total,
            list: result.map(item => ({
                comment_id: item._id,
                comment_content: item.content,
                handled_status: item.handledStatus,
                reported_userId: item.reportedUser.userId,
                reported_account: item.reportedUser.account,
                reported_avatar: item.reportedUser.avatar,
                reported_reasons: [...new Set(item.matchedReasons.filter(r => r))], // 过滤空值并去重
                work_id: item.workId,
                reported_count: item.reportCount,
                last_report_time: item.lastReportTime
            }))
        });
    } catch (error) {
        console.error("举报评论搜索失败:", error);
        failRes(res, "搜索失败", 500, 50000);
    }
});

module.exports = router;
