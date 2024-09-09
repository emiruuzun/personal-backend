const CustumError = require("../helpers/error/CustumError");
const User = require("../models/User");
const Leave = require("../models/LeaveRequest");
const Announcement = require("../models/Announcement");
const asyncErrorWrapper = require("express-async-handler");

const getAllUserAdmin = asyncErrorWrapper(async (req, res, next) => {
  const users = await User.find({ role: "user" }).select(
    "-password -profile_image -verificationToken -role -__v"
  );

  if (users.length === 0) {
    return next(new CustumError("No users found in the database", 404));
  }

  res.json({
    success: true,
    data: users,
  });
});

const deleteUserAdmin = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);

  if (!user) {
    return next(new CustumError("There is no such user with that id", 404));
  }

  await User.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "User and their answers deleted successfully",
  });
});

const toggleBlockUser = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    return next(new CustumError("There is no such user with that id", 404));
  }

  user.isBlockedByAdmin = !user.isBlockedByAdmin;
  await user.save();

  if (user.isBlockedByAdmin) {
    return res.status(200).json({
      success: true,
      message: "User has been blocked successfully",
      Blok: user.isBlockedByAdmin,
    });
  } else {
    return res.status(200).json({
      success: true,
      message: "User has been unblocked successfully",
      Blok: user.isBlockedByAdmin,
    });
  }
});

const announcement = asyncErrorWrapper(async (req, res, next) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return next(
      new CustumError(
        "Title and content are required for the announcement.",
        400
      )
    );
  }

  const newAnnouncement = await Announcement.create({
    title,
    content,
    createdBy: req.user.id,
  });

  req.io.emit("announcement", newAnnouncement);

  res.status(201).json({
    success: true,
    message: "Announcement has been created successfully.",
    data: newAnnouncement,
  });
});
const getAllLeave = asyncErrorWrapper(async (req, res, next) => {
  try {
    // Tüm kullanıcıların izin taleplerini getir
    const allLeaves = await Leave.find().populate(
      "userId",
      "fullName position email"
    );

    if (!allLeaves || allLeaves.length === 0) {
      return next(new CustumError("No leave requests found", 404));
    }

    res.status(200).json({
      success: true,
      data: allLeaves,
    });
  } catch (error) {
    console.error("Error fetching all leave requests:", error);
    return next(
      new CustumError("An error occurred while fetching leave requests", 500)
    );
  }
});

const statusUpdate = asyncErrorWrapper(async (req, res, next) => {
  const { leaveId, status } = req.body;

  // Geçerli bir durum kontrolü
  const validStatuses = ["Onaylandı", "Reddedildi", "Beklemede"];
  if (!validStatuses.includes(status)) {
    return next(new CustumError("Geçersiz durum değeri.", 400));
  }

  try {
    // İzin talebini ID ile bul ve durumunu güncelle
    const updatedLeave = await Leave.findByIdAndUpdate(
      leaveId,
      { status: status },
      { new: true, runValidators: true } // `new: true` yeni güncellenmiş dökümanı döndürür
    );

    // Eğer izin talebi bulunamazsa hata fırlat
    if (!updatedLeave) {
      return next(new CustumError("İzin talebi bulunamadı.", 404));
    }

    res.status(200).json({
      success: true,
      message: "İzin durumu başarıyla güncellendi.",
      data: updatedLeave,
    });
  } catch (error) {
    console.log(error);
    return next(
      new CustumError("İzin durumu güncellenirken hata oluştu.", 500)
    );
  }
});

module.exports = {
  getAllUserAdmin,
  deleteUserAdmin,
  toggleBlockUser,
  announcement,
  getAllLeave,
  statusUpdate,
};
