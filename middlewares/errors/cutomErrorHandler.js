const CustumError = require("../../helpers/error/CustumError");


const customErrorHandler = (err,req,res,next)=>{
   
    let custumError = err;
    // console.log(err.message)

    if(err.name ==="SyntaxError"){

        custumError = new CustumError("Unexpected Syntax",400)
    }
    if(err.name === "ValidationError"){

        custumError = new CustumError(err.message, 400)
    };
    if(err.code === 11000){
        // Dublicate key
        custumError = new CustumError("Dublicate Key Found : Check Your Input",400)
    };
    if(err.name === "CastError"){
        custumError = new CustumError("Invalid ID",400)
    };
    // Terminal error
    // console.log(custumError.name,custumError.message, custumError.status);

    res
    .status(custumError.status || 500)
    .json({
        success:false,
        message : custumError.message
    });
    
};

module.exports = customErrorHandler;