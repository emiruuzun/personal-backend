const User = require("../models/User");
const Announcemen = require("../models/Announcement");
const CustumError = require("../helpers/error/CustumError");
const asyncErrorWrapper = require("express-async-handler");
const { sendJwtToClient } = require("../helpers/authorization/tokenHelpers");
const {
  validateUserInput,
  comparePassword,
} = require("../helpers/authorization/input/inputHelpres");

// User Register

// User verify Token
const verify = asyncErrorWrapper(async (req, res, next) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return next(new CustumError("Invalid token", 400));
    }

    user.isVerify = true;
    user.verificationToken = undefined;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Account verified successfully" });
  } catch (error) {
    console.log(error);
    return next(new CustumError("Internal server error", 500));
  }
});

//User Login

const login = asyncErrorWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  if (!validateUserInput(email, password)) {
    return next(new CustumError("Please check your inputs"), 400);
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    return next(new CustumError("Please check your credentials"), 400);
  }

  if (!comparePassword(password, user.password)) {
    return next(new CustumError("Please check your credentials"), 400);
  }

  if (process.env.NODE_ENV !== "development" && !user.isVerify) {
    return next(new CustumError("Your account is not verified"), 400);
  }
  if (user.isBlockedByAdmin) {
    return next(new CustumError("You are blocked by admin"), 403);
  }

  sendJwtToClient(user, res);
});

// User account logout
const logout = asyncErrorWrapper(async (req, res, next) => {
  const { NODE_ENV } = process.env;

  return res
    .status(200)
    .cookie({
      httpOnly: true,
      expires: new Date(Date.now()),
      secure: NODE_ENV === "development" ? false : true,
    })
    .json({
      success: true,
      message: "Logout Succesfull",
    });
});

// User Delete Account
const deleteUser = asyncErrorWrapper(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new CustumError("User email or password is missing", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if (!user || !comparePassword(password, user.password)) {
    return next(new CustumError("Invalid email or password", 400));
  }

  const deletedUser = await User.findOneAndDelete({ email });

  if (!deletedUser) {
    return next(new CustumError("User not found", 404));
  }

  res.json({
    success: true,
    message: "User deleted successfully",
  });
});

// User List
const getUser = asyncErrorWrapper(async (req, res, next) => {
  const user = await User.findById(req.user.id);

  res.json({
    success: true,
    data: {
      name: user.name,
      email: user.email,
      creatAt: user.creatAt,
      profile_image: user.profile_image,
      layer: user.layer,
      role: user.role,
      position: user.position,
      tcNo: user.tcNo,
      contact: user.contact,
      status: user.status,
    },
  });
});

const imageUpload = asyncErrorWrapper(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      profile_image: req.savedProfileImage,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json({
    success: true,
    messega: " Image upload Succesfull",
    data: user,
  });
});

// Forgot Password

const forgotPassword = asyncErrorWrapper(async (req, res, next) => {
  const resetEmail = req.body.email;

  const user = await User.findOne({ email: resetEmail });

  if (!user) {
    return next(new CustumError("There is no user with that email"));
  }
  const resetPasswordToken = user.getResetPasswordTokenFromUser();

  await user.save();

  res.json({
    success: true,
    message: "Token Send To Your Email",
  });
});

const feed = asyncErrorWrapper(async (req, res, next) => {
  const announcements = await Announcemen.find().sort({ date: -1 });

  if (!announcements) {
    return next(new CustumError("There are no announcements found", 404));
  }

  res.status(200).json({
    success: true,
    data: announcements,
  });
});

module.exports = {
  login,
  verify,
  logout,
  getUser,
  deleteUser,
  imageUpload,
  forgotPassword,
  feed,
};
