const express = require("express");
const router = express.Router();
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");
const userCls = require("../../models/register");

//设置隐私
router.post("/updatePrivacy",  async (req, res) => {
        try {
            // 正确调用方式（传递两个参数）
            const result = validateParams(req.body, ['userId', 'hideLikesCollections', 'hideFollowRelations']);
            const { userId, hideLikesCollections, hideFollowRelations } = req.body;
            if (!result.isValid) {
                return failRes(res, result.message, 400, 40000);
            }

            const updatedUser = await userCls.findByIdAndUpdate(
                userId,
                {
                    $set: {
                        "privacySettings.hideLikesCollections": hideLikesCollections,
                        "privacySettings.hideFollowRelations": hideFollowRelations
                    }
                },
                { new: true }
            );

            successRes(res, "隐私设置更新成功", 200, 20000, {
                settings: updatedUser.privacySettings
            });

        } catch (error) {
            console.error("隐私设置失败:", error);
            failRes(res, "设置更新失败", 500, 50000);
        }
    });

//获取隐私状态
router.get("/getPrivacySettings/:userId", async (req, res) => {
    try {
        const user = await userCls.findById(req.params.userId)
            .select("privacySettings -_id");

        successRes(res, "获取成功", 200, 20000, user.privacySettings);

    } catch (error) {
        failRes(res, "获取设置失败", 500, 50001);
    }
      });

module.exports = router;