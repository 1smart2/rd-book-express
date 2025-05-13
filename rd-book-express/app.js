const express = require("express");
const paChong = require("./modules/paChong");
const exploreRouter = require("./router/explore/explore");
const loginRegisterRouter = require("./router/userCls/loginAndRegister");
const personalCenterRouter = require("./router/personalCenter/personalCenter");
const editPersonalInfoRouter=require("./router/editInfo/editPersonalInfo")
const noticeRouter=require("./router/notice/notice")
const createrRouter=require("./router/creater/creater")
const manageRouter =require("./router/manage/manage")
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/", exploreRouter, loginRegisterRouter, personalCenterRouter,
    editPersonalInfoRouter, noticeRouter, createrRouter, manageRouter);
// app.use("/",paChong)
module.exports = app;
