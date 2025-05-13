const express = require("express");
const router = express.Router();
const FirstScreen = require("../../models/firstScreenModel");
const Comment = require("../../models/comment")
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const FirstScreenLike = require('../../models/likeModel');
const CollectModel = require('../../models/collectModel');
const mongoose = require("mongoose");

//获取评论信息
router.get("/getMyComments", async (req, res) => {
    try {
        const { userId, page = 1, pageSize = 10 } = req.query;
        if (!userId) return failRes(res, "用户ID必传", 400, 40001);

        // 获取用户所有作品ID
        const works = await FirstScreen.find({ authorId: userId }).select('_id');
        const workIds = works.map(w => w._id);

        // 组合查询条件
        const query = {
            work: { $in: workIds },
            isDeleted: false
        };

        // 并行执行查询
        const [comments, total] = await Promise.all([
            Comment.find(query)
                .populate('author', 'account avatar')
                .populate({
                    path: 'work',
                    select: 'title imagesInfo account authorId avatar collectCount content createTime likeCount tip',
                    model: FirstScreen
                })
                .sort({ createdAt: -1 })  // 明确时间降序
                .skip((page - 1) * pageSize)
                .limit(Number(pageSize))
                .lean(),

            Comment.countDocuments(query)
        ]);

        // 构建响应结构
        successRes(res, "获取成功", 200, 20000, {
            total,
            list: comments.map(comment => ({
                commentId: comment._id,
                content: comment.content,
                createdAt: comment.createdAt,  // 确保返回时间字段
                commenter: comment.author,
                workInfo: {
                    _id: comment.work._id,
                    title: comment.work.title,
                    account: comment.work.account,
                    authorId: comment.work.authorId,
                    avatar: comment.work.avatar,
                    collectCount: comment.work.collectCount,
                    content: comment.work.content,
                    createTime: comment.work.createTime,
                    likeCount: comment.work.likeCount,
                    tip: comment.work.tip,
                    imagesInfo: comment.work.imagesInfo,
                    cover: comment.work.imagesInfo?.[0] || null
                }
            }))
        });
    } catch (error) {
        console.error("获取用户评论失败:", error);
        failRes(res, "获取失败", 500, 50000);
    }
});

// 点赞信息接口
router.get("/getMyWorkLikes", async (req, res) => {
    try {
        const { userId, page = 1, pageSize = 10 } = req.query;
        if (!userId) return failRes(res, "用户ID必传", 400, 40001);

        // 1. 获取用户所有作品ID
        const works = await FirstScreen.find({ authorId: userId }).lean();
        if (works.length === 0) {
            return successRes(res, "暂无作品", 200, 20000, { total: 0, list: [] });
        }
        const workIds = works.map(w => w._id.toString());

        // 2. 查询点赞记录（使用正确的模型引用）
        const likesDocs = await FirstScreenLike.find({
            "likes.workId": { $in: workIds }
        }).populate({
            path: 'userId',
            select: 'account avatar',
            model: 'userSchema' // 对应你的模型名称
        });

        // 3. 处理数据
        let likesList = [];
        likesDocs.forEach(doc => {
            doc.likes.forEach(like => {
                if (workIds.includes(like.workId.toString())) {
                    likesList.push({
                        user: {
                            account: doc.userId.account,
                            avatar: doc.userId.avatar
                        },
                        userId: doc.userId._id, // 新增用户ID字段
                        workId: like.workId,
                        createdAt: like.createdAt
                    });
                }
            });
        });

        // 4. 按时间排序和分页
        likesList.sort((a, b) => b.createdAt - a.createdAt);
        const total = likesList.length;
        const startIdx = (page - 1) * pageSize;
        const pagedList = likesList.slice(startIdx, startIdx + Number(pageSize));

        // 5. 获取作品信息
        const workIdsToFind = [...new Set(pagedList.map(i => i.workId))];
        const worksData = await FirstScreen.find({
            _id: { $in: workIdsToFind }
        }).lean();

        // 6. 构建响应数据（保持与发布接口一致）
        successRes(res, "获取成功", 200, 20000, {
            total,
            list: pagedList.map(item => {
                const work = worksData.find(w => w._id.equals(item.workId));
                return {
                    createdAt: item.createdAt,
                    likerInfo: {
                        _id: item.userId ,// 使用预处理存储的userId
                        account: item.user.account,
                        avatar: item.user.avatar,
                    },
                    workInfo: {
                        _id: work?._id,
                        title: work?.title,
                        imagesInfo: work?.imagesInfo,
                        authorId: work?.authorId,
                        account: work?.account,
                        avatar: work?.avatar,
                        createTime: work?.createTime,
                        collectCount: work?.collectCount,
                        likeCount: work?.likeCount
                    }
                };
            })
        });

    } catch (error) {
        console.error("获取作品点赞记录失败:", error);
        failRes(res, "获取失败", 500, 50000);
    }
});

//  收藏信息接口
// 修改后的获取收藏接口
router.get("/getMyCollects", async (req, res) => {
    try {
        const { userId, page = 1, pageSize = 10 } = req.query;
        if (!userId) return failRes(res, "用户ID必传", 400, 40001);

        // 分页参数校验
        if (page < 1 || pageSize < 1) {
            return failRes(res, "分页参数不合法", 400, 40002);
        }

        // 聚合查询优化
        const pipeline = [
            // 获取用户所有作品
            {
                $match: {
                    authorId: new mongoose.Types.ObjectId(userId) // 修正这里
                }
            },
            // 关联收藏记录
            {
                $lookup: {
                    from: "collects",
                    let: { workId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $in: ["$$workId", "$collects.workId"]
                                }
                            }
                        },
                        { $unwind: "$collects" },
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$collects.workId", "$$workId"]
                                }
                            }
                        }
                    ],
                    as: "collects"
                }
            },
            { $unwind: "$collects" },
            // 关联收藏者信息
            {
                $lookup: {
                    from: "userschemas",
                    localField: "collects.userId",
                    foreignField: "_id",
                    as: "collector"
                }
            },
            { $unwind: "$collector" },
            // 格式化数据
            {
                $project: {
                    _id: 0,
                    collectInfo: {
                        collector: {
                            _id: "$collects.userId",
                            account: "$collector.account",
                            avatar: "$collector.avatar"
                        },
                        workInfo: {
                            _id: "$_id",
                            title: "$title",
                            content: "$content",
                            imagesInfo: "$imagesInfo",
                            createTime: "$createTime",
                            collectCount: "$collectCount",
                            likeCount: "$likeCount",
                            authorId: "$authorId",
                            account: "$account",    // 新增
                            avatar: "$avatar"
                        },
                        collectTime: "$collects.collects.createdAt"
                    }
                }
            },
            // 分页处理
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [
                        { $sort: { "collectInfo.collectTime": -1 } },
                        { $skip: (page - 1) * pageSize },
                        { $limit: Number(pageSize) }
                    ]
                }
            }
        ];

        const [result] = await FirstScreen.aggregate(pipeline);

        const total = result.metadata[0]?.total || 0;
        const list = result.data.map(item => item.collectInfo);

        successRes(res, "获取成功", 200, 20000, {
            total,
            list
        });

    } catch (error) {
        console.error("获取收藏记录失败:", error);
        errorRes(res, "服务器错误", 500, 50000);
    }
});
module.exports = router;