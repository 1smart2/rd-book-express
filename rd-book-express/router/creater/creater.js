const express = require("express");
const router = express.Router();

const createrRouter = require("../../modules/creater/creater");

router.use(
    "/creater",
    createrRouter,
);

module.exports = router;