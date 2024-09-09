const CustumError = require("../../helpers/error/CustumError");
const asyncErrorWrapper = require("express-async-handler");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");

const {
  isTokenIncluded,
  getAccessTokenFromHeader,
} = require("../../helpers/authorization/tokenHelpers");

const getAccessToRoute = (req, res, next) => {
  const { JWT_SECRET_KEY } = process.env;
  if (!isTokenIncluded(req)) {
    // 401 Unauthorization && 403 Forbidden
    return next(
      new CustumError("You are not authorization to access this route ", 401)
    );
  }
  const AccessToken = getAccessTokenFromHeader(req);
  jwt.verify(AccessToken, JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return next(
        new CustumError("You are not authorization to access this route ", 401)
      );
    }
    req.user = {
      id: decoded.id,
      name: decoded.name,
      role: decoded.role,
    };
    next();
  });
};

const getAdminAccess = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.user;
  const user = await User.findById(id);

  if (user.role !== "admin") {
    return next(new CustumError("Only admin can perform the action", 403));
  }
  next();
});

module.exports = {
  getAccessToRoute,
  getAdminAccess,
};
