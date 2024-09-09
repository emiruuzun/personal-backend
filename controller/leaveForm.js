const LeaveRequest = require("../models/LeaveRequest"); // LeaveRequest modelini import edin
const CustomError = require("../helpers/error/CustumError");
const asyncErrorWrapper = require("express-async-handler");

const leaveSave = asyncErrorWrapper(async (req, res, next) => {
  const {
    fullName,
    position,
    periodYear,
    tcNo,
    leaveType,
    startDate,
    endDate,
    leaveDays,
    roadLeaveDays,
    address,
    contactNumber,
    reason,
  } = req.body;

  const userId = req.user.id;

  try {
    const newLeaveRequest = new LeaveRequest({
      fullName,
      position,
      periodYear,
      tcNo,
      leaveType,
      startDate,
      endDate,
      leaveDays,
      roadLeaveDays: roadLeaveDays || 0,
      address,
      contactNumber,
      reason,
      userId,
    });

    await newLeaveRequest.save();

    res.status(201).json({
      success: true,
      message: "İzin talebi başarıyla kaydedildi",
      data: newLeaveRequest,
    });
  } catch (error) {
    console.error("Detaylar:", error.errors); // Detaylı hata mesajları için
    // Veritabanına kaydederken bir hata oluşursa hata fırlat
    return next(
      new CustomError("İzin talebi kaydedilemedi. Lütfen tekrar deneyin.", 500)
    );
  }
});

const leaveGet = asyncErrorWrapper(async (req, res, next) => {
  const userId = req.user.id; // Oturum açmış kullanıcının kimliğini alın

  // Kullanıcının izin taleplerini çek
  const userLeaves = await LeaveRequest.find({ userId });

  if (!userLeaves) {
    return next(new CustomError("No leave requests found for this user", 404));
  }

  res.status(200).json({
    success: true,
    data: userLeaves,
  });
});

module.exports = {
  leaveSave,
  leaveGet,
};
