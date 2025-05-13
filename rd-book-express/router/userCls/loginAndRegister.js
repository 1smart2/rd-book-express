const express = require("express");
const router = express.Router();
const loginRouter = require("../../modules/Login/login");
const registerRouter = require("../../modules/Login/register");

router.use("/user", loginRouter, registerRouter);

module.exports = router;
