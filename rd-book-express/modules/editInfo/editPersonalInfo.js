const express = require("express");
const router = express.Router();
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");
const work = require("../../models/firstScreenModel");

router.put("/updateUserInfo", async (req, res) => {
    try {
        const result = validateParams(req.body, ["_id"]);
        if (!result.isValid) return failRes(res, result.message, 400, 40000);

        const { _id, avatar, age, account, birthDay, gender } = req.body;

        // 查找用户
        const user = await userCls.findById(_id);
        if (!user) return failRes(res, "用户不存在", 404, 40400);

        // 如果更新了 account，检查是否已存在
        if (account && account !== user.account) {
            const existingUser = await userCls.findOne({ account });
            if (existingUser) {
                return failRes(res, "用户名已存在", 400, 40001);
            }
        }

        // 更新允许修改的字段
        if (avatar) user.avatar = avatar;
        if (account) user.account = account;
        if (birthDay) user.birthDay = birthDay;
        if (gender) user.gender = gender;
        if (age) user.age = age;

        await user.save();

        // 如果更新了头像，同步更新用户的所有作品中的头像
        if (avatar) {
            await work.updateMany(
                { authorId: _id }, // 查找该用户的所有作品
                { $set: { avatar: avatar } } // 更新头像字段
            );
        }

        // 如果更新了 account，同步更新用户的所有作品中的 account
        if (account) {
            await work.updateMany(
                { authorId: _id }, // 查找该用户的所有作品
                { $set: { account: account } } // 更新 account 字段
            );
        }

        // 结构化返回数据
        const { _id: userId, avatar: userAvatar, account: userAccount,
            birthDay: userBirthDay, gender: userGender, age: userAge } = user.toObject();

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