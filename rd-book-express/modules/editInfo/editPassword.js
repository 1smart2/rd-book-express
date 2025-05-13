const express = require("express");
const router = express.Router();
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");
const bcryptjs = require("bcryptjs");

router.post("/updatePassword", async (req, res) => {
    try {
        // 参数验证（需要旧密码、新密码、用户ID）
        const result = validateParams(req.body, ["oldPassword", "newPassword", "userId"]);
        if (!result.isValid) return failRes(res, result.message, 200, 40000);

        const { oldPassword, newPassword, userId } = req.body;

        // 查找用户
        const user = await userCls.findById(userId).select("+password");
        if (!user) return failRes(res, "用户不存在", 200, 40400);

        // 验证旧密码
        const isMatch = await bcryptjs.compare(oldPassword, user.password);
        if (!isMatch) return failRes(res, "原始密码不正确", 200, 40101);

        // 更新密码
        const salt = await bcryptjs.genSalt(10);
        user.password = await bcryptjs.hash(newPassword, salt);
        await user.save();

        // 返回成功响应（不包含敏感信息）
        successRes(res, "密码修改成功", 200, 20000);
    } catch (error) {
        console.error("密码修改错误:", error);
        errorRes(res, "服务器错误", 200, 50000);
    }
});

module.exports = router;