const onlineUsers = require('../util/onlineUsers');
const Question = require("../models/Question");
const Notification = require("../models/Notification")
const CustumError = require("../helpers/error/CustumError");
const asyncErrorWrapper = require("express-async-handler");





const askNewQuestion = asyncErrorWrapper(async(req,res,next)=>{

    const information = req.body;
    console.log(information)

    const question = await Question.create({
        ...information,
        user : req.user.id
    });
    return res
    .status(200)
    .json({
        success: true,
        data : question
    });

});
const getAllQuestions = asyncErrorWrapper(async(req, res, next) => {
    const question = await Question.find()
        .populate('user', 'email') 
        .populate({
            path: 'answers',
            select: 'content',
            populate: {
                path: 'user', 
                select: 'email'
            }
        })
        .populate({
            path: 'likes',
            select :"email"
        });
        

    return res
        .status(200)
        .json({
            success: true,
            data: question
        });
});



const getMyQuestions = asyncErrorWrapper(async (req, res, next) => {
    const userId = req.user.id;
    const questions = await Question.find({ user: userId }).select("title content slug createdAt");

    return res.status(200).json({
        success: true,
        data: questions
    });
});


const editQuestion = asyncErrorWrapper(async(req,res,next)=>{

    const  { id } = req.params;
    const {title, content} = req.body;
    let  question = await Question.findById(id);
    question.title = title;
    question.content = content;
    question = await question.save();
    return   res
    .status(200)
    .json({
        success: true,
        data: question
    });

});


const deleteQuestion = asyncErrorWrapper(async(req,res,next)=>{
    const { id } = req.params;
    
    const question = await Question.findById(id);
    
    if (!question) {
        return next(new CustumError("There is no such question with that id", 400));
    }
    
    await Question.findByIdAndDelete(id);
    
    res.status(200)
        .json({
            success: true,
            message: "Question deleted successfully",
            data: question
        });
});


const likeQuestion = asyncErrorWrapper(async (req, res, next) => {
    const { id } = req.params;
    
    // User modelini de populate ederek soru sahibinin e-postasını alın
    const question = await Question.findById(id).populate({
      path: 'user',
      select: 'email' // Sadece email alanını almak için
    });

    if (!question) {
        return next(new CustumError('No question found with that ID', 404));
    }

    if (question.likes.includes(req.user.id)) {
        return next(new CustumError('You have already liked this question', 400));
    }

    question.likes.push(req.user.id);
    await question.save();

    // onlineUsers'dan alınan socket id'yi kullanarak emit edin
    const ownerSocketId = onlineUsers[question.user._id.toString()];
    console.log(req.user)
    if (ownerSocketId) {
        req.io.to(ownerSocketId).emit('likeNotification', {
            likedBy: req.user.name, 
            questionTitle: question.title, 
        });
    }

    const notification = new Notification({
        likedBy: req.user.id,
        questionId: question._id
    });
    await notification.save();
    
    return res.status(200).json({
        success: true,
        message: "The question has been liked"
    });
});



const getMyLikes = asyncErrorWrapper(async (req, res, next) => {
    const userId = req.user.id; 
    // const { likeUser } = req.body

    const questions = await Question.find({ user: userId });

   
    const questionIds = questions.map(question => question._id);

    const notifications = await Notification.find({ questionId: { $in: questionIds } /*, likedBy:likeUser */ }).populate('likedBy', 'email').populate('questionId', 'title');
    return res.status(200)
    .json({
        success: true,
        data: notifications
    })
});



const undolikeQuestion = asyncErrorWrapper(async(req,res,next)=>{

    const {id} = req.params;
    const question = await Question.findById(id);
    if(question.likes.includes(req.user.id)){
        return next(new CustumError('You can not like this question',400))
    
    };
    const index = question.likes.indexOf(req.user.id);
    question.likes.splice(index,1);
    await question.save();
    return res
    .status(200)
    .json({
        success: true,
        success:true,
        message:"The question has been un-liked" 
    })
});


module.exports = {
    askNewQuestion,
    getAllQuestions,
    getMyQuestions,
    editQuestion,
    deleteQuestion,
    likeQuestion,
    getMyLikes,
    undolikeQuestion
}

