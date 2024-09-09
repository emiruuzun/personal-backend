const express = require("express");
const {
    askNewQuestion,
    getAllQuestions,
    getMyQuestions,
    editQuestion,
    deleteQuestion,
    likeQuestion,
    getMyLikes,
    undolikeQuestion
} = require("../controller/question");

const answer = require("./answer");

const {checkQuestionExist} = require("../middlewares/database/databaseErrorHelpers");
const {getAccessToRoute, getQuestionOwnerAccess} = require("../middlewares/authorization/auth");

const router = express.Router();

router.get("/", getAllQuestions );
router.get("/myquestions", getAccessToRoute, getMyQuestions );
router.get("/:id/like",[getAccessToRoute, checkQuestionExist], likeQuestion);
router.get("/:id/undo_like",[getAccessToRoute, checkQuestionExist], undolikeQuestion);
router.get("/myLikes", getAccessToRoute, getMyLikes)
router.post("/ask", getAccessToRoute, askNewQuestion );
router.put("/:id/edit",[getAccessToRoute, checkQuestionExist, getQuestionOwnerAccess], editQuestion);
router.get("/:id/delete",[getAccessToRoute, checkQuestionExist, getQuestionOwnerAccess], deleteQuestion );
router.use("/answers", answer);


module.exports = router;