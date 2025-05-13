const express = require("express");
const router = express.Router();
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");
const FirstScreen = require("../../models/firstScreenModel");
const mongoose = require("mongoose");
const Comment = require("../../models/comment");
const FirstScreenLike=require("../../models/likeModel")
const CollectModel=require("../../models/collectModel")

//获取七日粉丝增加
router.get("/getRecentFansCount", async (req, res) => {
    try {
        const { userId } = req.query;

        // 创建北京时间的当天结束时刻（23:59:59.999）
        const now = new Date();
        const endDate = new Date(now.getTime() + 8 * 60 * 60 * 1000); // UTC+8
        endDate.setHours(23, 59, 59, 999);

        // 计算7天范围（包含今天）
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);

        const user = await userCls.findById(userId);
        if (!user) return failRes(res, "用户不存在", 404, 40400);

        // 生成日期范围（按北京时间）
        const dailyCounts = [];
        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(startDate);
            dayStart.setDate(startDate.getDate() + i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);

            const count = user.fans.filter(f => {
                const fanDate = new Date(f.timestamp.getTime() + 8 * 60 * 60 * 1000); // 转UTC+8
                return fanDate >= dayStart && fanDate < dayEnd;
            }).length;

            dailyCounts.push({
                date: dayStart.toISOString().split('T')[0].replace(/-/g, '/'),
                count
            });
        }

        successRes(res, "查询成功", 200, 20000, { dailyCounts });
    } catch (error) {
        errorRes(res, "服务器错误", 500, 50000);
    }
});

//获取粉丝年龄组成
router.get("/getFansAgeDistribution", async (req, res) => {
    try {
        const { userId } = req.query;
        const user = await userCls.findById(userId).populate({
            path: 'fans.userId',
            select: 'age',
            options: { retainNullValues: true }
        });

        if (!user) return failRes(res, "用户不存在", 404, 40400);

        // 定义年龄区间配置
        const ageGroups = [
            { min: 0, max: 18, name: '0~18岁' },
            { min: 19, max: 25, name: '19~25岁' },
            { min: 26, max: 39, name: '26~39岁' },
            { min: 40, max: 59, name: '40~59岁' },
            { min: 60, max: Infinity, name: '60岁以上' }
        ];

        // 初始化统计结果
        const result = ageGroups.map(group => ({
            value: 0,
            name: group.name
        }));

        // 统计各区间数量
        user.fans.forEach(fan => {
            const age = Number(fan.userId?.age) || 0;
            const group = ageGroups.find(g => age >= g.min && age <= g.max);
            if (group) result.find(r => r.name === group.name).value++;
          });

        // 计算百分比
        const totalFans = user.fans.length;
        if (totalFans > 0) {
            let totalPercent = 0;
            result.forEach((item, index) => {
                const percent = Math.round((item.value / totalFans) * 100);
                // 最后一个区间承担余数
                if (index === result.length - 1) {
                    item.value = 100 - totalPercent;
                } else {
                    item.value = percent;
                    totalPercent += percent;
                }
            });
        }
        
        res.status(200).json({
            code: 20000,
            message: "查询成功",
            data: result // 直接返回数组
          });
    } catch (error) {
        errorRes(res, "服务器错误", 500, 50000);
    }
});

//获取作品信息数量
router.get("/getCreatorStats", async (req, res) => {
    try {
        const { userId } = req.query;

        // 验证用户存在
        const user = await userCls.findById(userId);
        if (!user) return failRes(res, "用户不存在", 404, 40400);

        // 获取作品统计（已修正）
        const worksStats = await FirstScreen.aggregate([
            {
                $match: {
                    authorId: new mongoose.Types.ObjectId(userId) // 这里已修改
                }
            },
            {
                $group: {
                    _id: null,
                    totalWorks: { $sum: 1 },
                    totalLikes: { $sum: "$likeCount" },
                    totalCollects: { $sum: "$collectCount" }
                }
            }
        ]);

        // 获取作品ID列表（根据实际存储类型选择方案）
        const workIds = await FirstScreen.find({ authorId: userId })
            .distinct('_id');

        // 获取评论统计
        const commentStats = await Comment.aggregate([
            {
                $match: {
                    work: { $in: workIds },
                    isDeleted: false
                }
            },
            {
                $group: {
                    _id: null,
                    totalComments: { $sum: 1 }
                }
            }
        ]);

        // 合并结果
        const result = {
            worksCount: worksStats[0]?.totalWorks || 0,
            likesCount: worksStats[0]?.totalLikes || 0,
            collectsCount: worksStats[0]?.totalCollects || 0,
            commentsCount: commentStats[0]?.totalComments || 0
          };

        successRes(res, "查询成功", 200, 20000, result);
    } catch (error) {
        console.error('统计错误:', error);
        errorRes(res, "服务器错误", 500, 50000);
    }
});

//七日互动数据
router.get("/getRecentInteractions", async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return failRes(res, "用户ID必传", 400, 40001);

        // 生成北京时间日期范围
        const dateList = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - 6 + i);
            date.setHours(0, 0, 0, 0); // 北京时间的当天开始
            return date;
        });

        // 获取用户所有作品ID
        const works = await FirstScreen.find({ authorId: userId }).select('_id');
        const workIds = works.map(w => w._id);

        // 并行查询三个数据源
        const [likesData, collectsData, commentsData] = await Promise.all([
            // 点赞数据
            FirstScreenLike.aggregate([
                { $unwind: "$likes" },
                {
                    $match: {
                        "likes.workId": { $in: workIds },
                        "likes.createdAt": {
                            $gte: dateList[0],
                            $lte: new Date(dateList[6].getTime() + 86400000) // 包含最后一天的23:59:59
                        }
                    }
                },
                {
                    $project: {
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$likes.createdAt",
                                timezone: "+08:00"
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$date",
                        count: { $sum: 1 }
                    }
                }
            ]),

            // 收藏数据
            CollectModel.aggregate([
                { $unwind: "$collects" },
                {
                    $match: {
                        "collects.workId": { $in: workIds },
                        "collects.createdAt": {
                            $gte: dateList[0],
                            $lte: new Date(dateList[6].getTime() + 86400000)
                        }
                    }
                },
                {
                    $project: {
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$collects.createdAt",
                                timezone: "+08:00"
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$date",
                        count: { $sum: 1 }
                    }
                }
            ]),

            // 评论数据
            Comment.aggregate([
                {
                    $match: {
                        work: { $in: workIds },
                        createdAt: {
                            $gte: dateList[0],
                            $lte: new Date(dateList[6].getTime() + 86400000)
                        }
                    }
                },
                {
                    $project: {
                        date: {
                            $dateToString: {
                                format: "%Y-%m-%d",
                                date: "$createdAt",
                                timezone: "+08:00"
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: "$date",
                        count: { $sum: 1 }
                    }
                }
            ])
        ]);

        // 生成日期标签（北京时间的YYYY-MM-DD格式）
        const dateLabels = dateList.map(d =>
            new Date(d.getTime() + 28800000) // +8小时转北京时间
                .toISOString()
                .split('T')[0]
        );

        // 初始化数据容器
        const result = dateLabels.map(date => ({
            date,
            likes: 0,
            collects: 0,
            comments: 0
        }));

        // 填充数据
        const fillData = (data, type) => {
            data.forEach(item => {
                const index = dateLabels.indexOf(item._id);
                if (index !== -1) {
                    result[index][type] = item.count;
                }
            });
        };

        fillData(likesData, 'likes');
        fillData(collectsData, 'collects');
        fillData(commentsData, 'comments');

        successRes(res, "获取成功", 200, 20000, {
            chartData: result
        });

    } catch (error) {
        console.error("获取互动数据失败:", error);
        errorRes(res, "服务器错误", 500, 50000);
    }
});


module.exports = router;