const express = require("express");
const router = express.Router();

const editPersonalInfoRouter = require("../../modules/editInfo/editPersonalInfo");
const editPassword=require("../../modules/editInfo/editPassword")
const setPrivacy=require("../../modules/editInfo/setPrivacy")

router.use(
    "/editPersonal",
    editPersonalInfoRouter,
    editPassword,
    setPrivacy
);

module.exports = router;