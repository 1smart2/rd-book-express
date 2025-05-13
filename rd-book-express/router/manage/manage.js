const express = require("express");
const router = express.Router();
const getAllUser = require("../../modules/manage/getAllUser");
const updateRole=require("../../modules/manage/admin")

router.use(
    "/manage",
    getAllUser,
    updateRole
   
);

module.exports = router;
  