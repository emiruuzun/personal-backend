const User = require("../../models/User")
const asyncErrorWrapper = require("express-async-handler");
const CustumError = require("../../helpers/error/CustumError");


const checkBlockStatus = asyncErrorWrapper(async (req, res, next) => {
    const user = await User.findById(req.user.id);
  
    if (user.blockedUntil && user.blockedUntil > Date.now()) {
      return next(new CustumError(" Bu Hesabın 1 ay boyunca sınavlara erişimi engellendi " + new Date(user.blockedUntil), 403));
    } else if (user.blockedUntil && user.blockedUntil <= Date.now()) {
      user.blockedUntil = null;
      user.failedAttempts = 0;
      await user.save();
    }
  
    next();
  });
  

module.exports = {
  checkBlockStatus
};