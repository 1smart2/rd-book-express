const express = require("express");
const router = express.Router();

const getMyCommentsRouter = require("../../modules/notice/notice");

router.use(
    "/notice",
    getMyCommentsRouter
);

module.exports = router;