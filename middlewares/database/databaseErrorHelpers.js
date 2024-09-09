const Question = require("../../models/Question");
const CustumError = require("../../helpers/error/CustumError");
const asyncErrorWrapper = require("express-async-handler");




const checkQuestionExist = asyncErrorWrapper(async(req,res,next)=>{

    const question_id = req.params.id || req.params.question_id
    const question = await Question.findById(question_id);
    if(!question){
        return next(new CustumError("There is no question with that id",404));
    }
    next();

});


module.exports = {
    checkQuestionExist
}