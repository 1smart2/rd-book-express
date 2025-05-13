const express = require("express");
const router = express.Router();
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");

//获取所有普通用户
router.get("/getAllUsers", async (req, res) => {
    try {
        // 分页参数处理
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // 参数有效性校验
        if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
            return failRes(res, "无效的分页参数", 400, 40001);
        }
        // 修改查询条件
        const query = { role: 0 }; // 新增角色过滤条件

        // 分页查询
        const [users, total] = await Promise.all([
            userCls.find(query)
                .select('-password -privacySettings')
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .transform(docs => docs.map(user => ({
                    ...user,
                    attentionCount: user.attention?.length || 0,
                    fansCount: user.fans?.length || 0,
                    worksCount: user.works?.length || 0,
                    attention: undefined,
                    fans: undefined,
                    works: undefined
                }))),
            userCls.countDocuments(query) // 获取总条数
        ]);

        successRes(res, "获取成功", 200, 20000, {
            pagination: {
                currentPage: page,
                pageSize: limit,
                totalItems: total,
                totalPages: Math.ceil(total / limit)
            },
            users
        });
    } catch (error) {
        console.error("分页获取用户错误:", error);
        errorRes(res, "服务器内部错误", 500, 50000);
    }
});

//根据账号模糊搜索用户信息
router.get("/searchUsers", async (req, res) => {
    try {
        // 参数校验
        const { keyword, page = 1, limit = 10 } = req.query;
        if (!keyword?.trim()) {
            return failRes(res, "搜索关键词不能为空", 400, 40002);
        }

        // 转换分页参数
        const pageNum = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;
        if (isNaN(pageNum) || pageNum < 1 || isNaN(pageSize) || pageSize < 1) {
            return failRes(res, "无效的分页参数", 400, 40001);
        }

        // 构建搜索条件（扩展多个字段）
        const searchCondition = {
            $and: [
                { role: 0 }, // 新增角色过滤条件
                {
                    $or: [
                        { account: { $regex: keyword, $options: 'i' } },
                        { gender: { $regex: `^${keyword}$`, $options: 'i' } },
                        { birthDay: { $regex: keyword } }
                    ]
                }
            ]
        };

        // 并行查询
        const [users, total] = await Promise.all([
            userCls.find(searchCondition)
                .select('-password -privacySettings')
                .skip((pageNum - 1) * pageSize)
                .limit(pageSize)
                .lean()
                .transform(docs => docs.map(formatUserStats)), // 统计字段处理
            userCls.countDocuments(searchCondition)
        ]);

        successRes(res, "搜索成功", 200, 20000, {
            pagination: {
                currentPage: pageNum,
                pageSize: pageSize,
                totalItems: total,
                totalPages: Math.ceil(total / pageSize)
            },
            users
        });
    } catch (error) {
        console.error("用户搜索错误:", error);
        errorRes(res, "服务器内部错误", 500, 50000);
    }
});

//根据账号模糊搜索管理员信息
router.get("/searchAdmins", async (req, res) => {
    try {
        // 参数校验
        const { keyword, page = 1, limit = 10 } = req.query;
        if (!keyword?.trim()) {
            return failRes(res, "搜索关键词不能为空", 400, 40002);
        }

        // 转换分页参数
        const pageNum = parseInt(page) || 1;
        const pageSize = parseInt(limit) || 10;
        if (isNaN(pageNum) || pageNum < 1 || isNaN(pageSize) || pageSize < 1) {
            return failRes(res, "无效的分页参数", 400, 40001);
        }

        // 构建搜索条件（扩展多个字段）
        const searchCondition = {
            $and: [
                { role: 1 }, // 新增角色过滤条件
                {
                    $or: [
                        { account: { $regex: keyword, $options: 'i' } },
                        { gender: { $regex: `^${keyword}$`, $options: 'i' } },
                        { birthDay: { $regex: keyword } }
                    ]
                }
            ]
        };

        // 并行查询
        const [admins, total] = await Promise.all([
            userCls.find(searchCondition)
                .select('-password -privacySettings')
                .skip((pageNum - 1) * pageSize)
                .limit(pageSize)
                .lean()
                .transform(docs => docs.map(formatUserStats)), // 统计字段处理
            userCls.countDocuments(searchCondition)
        ]);

        successRes(res, "搜索成功", 200, 20000, {
            pagination: {
                currentPage: pageNum,
                pageSize: pageSize,
                totalItems: total,
                totalPages: Math.ceil(total / pageSize)
            },
            admins
        });
    } catch (error) {
        console.error("管理员搜索错误:", error);
        errorRes(res, "服务器内部错误", 500, 50000);
    }
});

// 公共统计字段格式化方法
const formatUserStats = (user) => ({
    ...user,
    canComment: user.canComment, // 新增禁言状态字段
    attentionCount: user.attention?.length || 0,
    fansCount: user.fans?.length || 0,
    worksCount: user.works?.length || 0,
    attention: undefined,
    fans: undefined,
    works: undefined
});

//获取所有管理员
router.get("/getAllAdmins", async (req, res) => {
    try {
        // 分页参数处理（与普通用户接口相同）
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // 参数校验（可复用相同逻辑）
        if (isNaN(page) || page < 1 || isNaN(limit) || limit < 1) {
            return failRes(res, "无效的分页参数", 400, 40001);
        }

        // 构建管理员查询条件
        const query = { role: 1 };

        // 执行查询
        const [admins, total] = await Promise.all([
            userCls.find(query)
                .select('-password -privacySettings')
                .skip((page - 1) * limit)
                .limit(limit)
                .lean()
                .transform(docs => docs.map(formatUserStats)),
            userCls.countDocuments(query)
        ]);

        successRes(res, "管理员列表获取成功", 200, 20000, {
            pagination: {
                currentPage: page,
                pageSize: limit,
                totalItems: total,
                totalPages: Math.ceil(total / limit)
            },
            admins // 修改返回字段名为admins以示区分
        });
    } catch (error) {
        console.error("获取管理员列表错误:", error);
        errorRes(res, "服务器内部错误", 500, 50002); // 使用新错误码
    }
});

module.exports = router;
