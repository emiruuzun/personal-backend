const express = require("express");

const { getAccessToRoute } = require("../middlewares/authorization/auth");
const {checkQuestionExist} = require("../middlewares/database/databaseErrorHelpers");
const {addNewAnswerQuestion, getMyAnswers} = require("../controller/answer")
const router = express.Router({mergeParams:true});

router.post("/:question_id/", [getAccessToRoute,checkQuestionExist], addNewAnswerQuestion);
router.get("/getMyAnswer", getAccessToRoute, getMyAnswers );


module.exports = router;