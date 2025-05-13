const express = require("express");
const router = express.Router();
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");

router.put("/updateUserInfo", async (req, res) => {
    try {
        const result = validateParams(req.body, ["_id"]);
        if (!result.isValid) return failRes(res, result.message, 400, 40000);

        const { _id, avatar,age, account, birthDay, gender } = req.body;

        // 查找用户
        const user = await userCls.findById(_id);
        if (!user) return failRes(res, "用户不存在", 404, 40400);

        // 更新允许修改的字段
        if (avatar) user.avatar = avatar;
        if (account) user.account = account;
        if (birthDay) user.birthDay = birthDay;
        if (gender) user.gender = gender;
        if(age) user.age=age

        await user.save();
        // 结构化返回数据
        const { _id: userId, avatar: userAvatar, account: userAccount,
            birthDay: userBirthDay, gender: userGender,age:userAge } = user.toObject();

        // 返回更新后的数据（可根据需要过滤敏感字段）
        successRes(res, "信息更新成功", 200, 20000, {
            _id: userId,
            avatar: userAvatar,
            account: userAccount,
            age: userAge,
            birthDay: new Date(userBirthDay).toISOString().split('T')[0],
            gender: userGender
        });
    } catch (error) {
        console.error(error);
        errorRes(res, "服务器错误", 500, 50000);
    }
});

module.exports = router;