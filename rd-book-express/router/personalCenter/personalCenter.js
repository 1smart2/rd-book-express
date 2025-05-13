const express = require("express");
const router = express.Router();
const getLikeArrRouter = require("../../modules/personalCenter/getLikeArr");
const getMyPublishRouter = require("../../modules/personalCenter/getMyPublish");
const getCollectionRouter = require("../../modules/personalCenter/getCollection");
const getPersonalInfoRouter = require("../../modules/personalCenter/getPersonalInfo");
const getAttentionAndFansRouter = require("../../modules/personalCenter/getAttentionAndFans");

router.use(
  "/personal",
  getLikeArrRouter,
  getMyPublishRouter,
  getCollectionRouter,
  getPersonalInfoRouter,
  getAttentionAndFansRouter
);

module.exports = router;
