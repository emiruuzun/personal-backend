const express = require("express");
const { 
    register,
    verify,
    login,
    logout,
    deleteUser,
    getUser,
    imageUpload,
    forgotPassword,
    feed
} = require("../controller/auth");
const {getAccessToRoute} = require("../middlewares/authorization/auth");

const profileImageUpload = require("../middlewares/libraries/profileImgUpload")



// api router
const router = express.Router();


router.post("/register",register);
router.get("/verify", verify);
router.post("/login", login)
router.get("/profile", getAccessToRoute ,getUser);
router.get("/logout", getAccessToRoute, logout);
router.post("/delete", getAccessToRoute, deleteUser);
router.post("/upload",[getAccessToRoute, profileImageUpload], imageUpload );
router.post("/forgotPassword", forgotPassword )
router.get("/feed", getAccessToRoute, feed );



module.exports = router;

