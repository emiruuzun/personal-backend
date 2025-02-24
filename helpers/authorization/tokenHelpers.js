const sendJwtToClient = (user, res)=>{
    console.log(user)

    // Generate JWT
    
    const token = user.generateJwtFromUser();
    const {JWT_COOKIE, NODE_ENV} = process.env;
    return res
    .status(200)
    .cookie("access_token",token, {

        httpOnly :true,
        expires: new Date(Date.now() + parseInt(JWT_COOKIE) *  1000),
        secure : NODE_ENV === "development" ? false : true,
        sameSite: NODE_ENV === "development" ? "Lax" : "None"
        
    })
    .json({
        success : true,
        access_token : token,
        data : {
            id :user._id,
            name: user.name,
            email: user.email,
            role: user.role
        }

    });
};
const isTokenIncluded = (req) =>{

    return (req.headers.authorization && req.headers.authorization.startsWith('Bearer:')
    );
};
const getAccessTokenFromHeader = (req)=>{
    
    const authorization = req.headers.authorization;
    const access_token = authorization.split(" ")[1];
    return access_token;
};

module.exports = {
    sendJwtToClient,
    isTokenIncluded,
    getAccessTokenFromHeader
    
}