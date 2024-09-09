const multer =require("multer");
const path = require("path");
const CustumError = require("../../helpers/error/CustumError");

const storage = multer.diskStorage({

    destination : function(req,res,cb){

        const rootDir = path.dirname(require.main.filename);
        cb(null, path.join(rootDir, "/public/uploads"))
    },
    filename : function(req,file,cb){

        const extension = file.mimetype.split("/")[1];
        req.savedProfileImage = "image_" + req.user.id + "." + extension;
        cb(null, req.savedProfileImage)

    }
});

const fileFilter = (req, file,cb)=>{


    let allowedMimetypes =  ["image/jpg", "image/gif", "image/jpeg", "image/png"];

    if(!allowedMimetypes.includes(file.mimetype)){

        return cb(new CustumError(("Plase Provide  a image file"), 400), false);
    }
    return cb(null,true)
};

const profileImageUpload = multer({
    
    storage: storage,
    fileFilter: fileFilter
}).single("profile_image");;


module.exports = profileImageUpload; 