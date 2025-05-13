const express = require("express");
const router = express.Router();
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");

//更新权限
router.put('/users/:userId/role', async (req, res) => {
    try {
        // 1. 从请求体获取管理员ID
        const { adminId } = req.body;

        // 2. 验证管理员权限
        const admin = await userCls.findById(adminId);

        if (!admin || admin.role !== 1) {
            return res.status(403).json({ message: '管理员身份验证失败' });
        }

        // 获取目标用户当前状态
        const targetUser = await userCls.findById(req.params.userId);
        if (!targetUser) {
            return failRes(res, '目标用户不存在', 404, 40402);
        }

        // 验证当前角色是否允许变更
        if (targetUser.role !== 0) {
            return failRes(res,
                targetUser.role === 1 ? '用户已是管理员' : '非法角色状态',
                400,
                40004
            );
        }

        // 3. 更新目标用户
        const updatedUser = await userCls.findByIdAndUpdate(
            req.params.userId, // 使用URL参数获取用户ID
            { role: 1 }, // 强制设置为管理员
            {
                new: true, runValidators: true,// 添加条件确保只修改普通用户
                overwriteDiscriminatorKey: true,
                context: 'query'
            }
        );

        // 4. 返回结果
        successRes(res,
            '权限更新成功',
            200,    // HTTP状态码
            20001,  // 自定义业务码（需与已有码统一规划）
            {
                adminId: admin._id,
                targetUserId: updatedUser._id,
                previousRole: 0,
                newRole: updatedUser.role
            }
        );
    } catch (err) {
        errorRes(res,
            '操作失败',
            500,
            50001,  // 错误业务码
            { error: err.message }
        );
    }
});

// 新增取消管理员权限接口
router.put('/users/:userId/revoke-admin', async (req, res) => {
    try {
        // 1. 获取并验证管理员身份
        const { adminId } = req.body;
        const admin = await userCls.findById(adminId);

        // 验证管理员身份
        if (!admin || admin.role !== 1) {
            return failRes(res, '需要管理员权限操作', 403, 40301);
        }

        // 2. 获取目标用户
        const targetUserId = req.params.userId;

        // 禁止自我撤销
        if (admin._id.toString() === targetUserId) {
            return failRes(res, '不能撤销自己的管理员权限', 403, 40302);
        }

        // 3. 执行权限撤销
        const revokedUser = await userCls.findByIdAndUpdate(
            {
                _id: targetUserId,
                role: 1 // 只允许撤销管理员 
            },
            { role: 0 }, // 强制设置为普通用户
            {
                new: true,
                runValidators: true,
                // 添加额外筛选确保只修改管理员
                overwriteDiscriminatorKey: true,
                context: 'query'
            }
        );

        // 处理目标用户不存在的情况
        if (!revokedUser) {
            return failRes(res,
                '目标用户不存在或不是管理员',
                404,
                40403
            );
        }

        // 4. 返回结果
        successRes(res,
            '管理员权限已撤销',
            200,
            20001,
            {
                adminId: admin._id,
                revokedUserId: revokedUser._id,
                previousRole: 1,
                newRole: revokedUser.role
            }
        );
    } catch (err) {
        // 增强错误类型判断
        const errorMessage = err.message.includes("Cast to ObjectId failed")
            ? "无效的用户ID格式"
            : err.message.includes("validation failed")
                ? "角色值验证失败"
                : err.message;

        errorRes(res,
            '权限撤销失败',
            500,
            50002,
            { error: errorMessage }
        );
    }
});

module.exports = router;