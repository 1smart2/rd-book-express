const express = require("express");
const router = express.Router();
const exploreFirstScreen = require("../../modules/explore/firstScreen");
const publishRouter = require("../../modules/explore/publish");
const updateLikeRouter = require("../../modules/explore/updateLike");
const updataCollectRouter = require("../../modules/explore/updateCollect");
const searchTitleAndContentRouter = require("../../modules/explore/searchTitleAndContent");
const attentionSomeBodyRouter = require("../../modules/explore/attentionSomeBody");
const commentRouter=require("../../modules/explore/comment")
const deletePublishRouter=require("../../modules/explore/deletePublish")

router.use(
  "/explore",
  exploreFirstScreen,
  publishRouter,
  updateLikeRouter,
  updataCollectRouter,
  searchTitleAndContentRouter,
  attentionSomeBodyRouter,
  commentRouter,
  deletePublishRouter
);

module.exports = router;
