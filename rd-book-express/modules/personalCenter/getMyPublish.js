const express = require("express");
const router = express.Router();
const firstScreenSchema = require("../../models/firstScreenModel");
const { validateParams } = require("../../utils/global");
const { successRes, failRes, errorRes } = require("../../utils/responseUtil");

router.post("/getMyPublish", (req, res) => {
  try {
    const result = validateParams(req.body, ["userId", "curPage", "pageSize"]);
    if (result.isValid) {
      const { userId, curPage, pageSize } = req.body;
      const Curpage = parseInt(curPage, 10) || 1;
      const PageSize = parseInt(pageSize, 10) || 10;
      // 查询总记录数
      firstScreenSchema
        .countDocuments({ authorId: userId })
        .then((totalCount) => {
          // 分页查询
          firstScreenSchema
            .find({ authorId: userId })
            .sort({ _id: -1 })
            .skip((Curpage - 1) * PageSize)
            .limit(PageSize)
            .then((data) => {
              successRes(res, "获取成功", 200, 20000, {
                data,
                total: totalCount,
              });
            })
            .catch((err) => {
              errorRes(res, "服务器内部错误", 500, 500);
            });
        })
        .catch((err) => {
          errorRes(res, "服务器内部错误", 500, 500);
        });
    } else {
      failRes(res, result.message, 400, 40000);
    }
  } catch (error) {
    errorRes(res, "服务器内部错误", 500, 500);
  }
});

module.exports = router;
