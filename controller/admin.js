const onlineUsers = require("../util/onlineUsers");
const CustumError = require("../helpers/error/CustumError");
const User = require("../models/User");
const Leave = require("../models/LeaveRequest");
const sendEmail = require("../helpers/libraries/sendEmail");
const generateVerificationToken = require("../util/emailVefiyToken");
const Announcement = require("../models/Announcement");
const CompanySc = require("../models/CompanySchema ");
const asyncErrorWrapper = require("express-async-handler");

const register = asyncErrorWrapper(async (req, res, next) => {
  const { name, email, password, position, tcNo, contact, status, role } =
    req.body;
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(
      new CustumError(
        "This email address is already in use. Please try another email.",
        400
      )
    );
  }

  let verificationToken;
  if (process.env.NODE_ENV !== "development") {
    verificationToken = generateVerificationToken();
  }

  const user = await User.create({
    name,
    email,
    password,
    position,
    role,
    tcNo,
    contact,
    status,
    verificationToken,
    isVerify: process.env.NODE_ENV === "development",
  });

  if (process.env.NODE_ENV !== "development") {
    const verifyURL = `${process.env.CLIENT_URL}=${verificationToken}`;
    console.log(verifyURL);
    const subject = "Account Verification";
    const text = `Please click the following link to verify your account: ${verifyURL}`;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: user.email,
      subject,
      text,
    };

    await sendEmail(mailOptions);
  }

  res.status(201).json({
    success: true,
    message:
      "User registered successfully. Please check your email to verify your account.",
  });
});

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
  const { leaveId, status, rejectionReason } = req.body;

  // Geçerli bir durum kontrolü
  const validStatuses = ["Onaylandı", "Reddedildi", "Beklemede"];
  if (!validStatuses.includes(status)) {
    return next(new CustumError("Geçersiz durum değeri.", 400));
  }

  try {
    // İzin talebini bul
    const leave = await Leave.findById(leaveId);

    // Eğer izin talebi bulunamazsa hata fırlat
    if (!leave) {
      return next(new CustumError("İzin talebi bulunamadı.", 404));
    }

    // Eğer izin talebi zaten "Onaylandı" veya "Reddedildi" ise güncelleme yapılmasın
    if (leave.status === "Onaylandı" || leave.status === "Reddedildi") {
      return next(
        new CustumError(
          "İzin talebi zaten sonuçlandırılmış, tekrar güncellenemez.",
          400
        )
      );
    }

    // Eğer durum "Reddedildi" ise, reddetme nedeni kontrolü yapılmalıdır.
    if (
      status === "Reddedildi" &&
      (!rejectionReason || rejectionReason.trim() === "")
    ) {
      return next(new CustumError("Reddetme nedeni belirtilmelidir.", 400));
    }

    // Güncelleme verisi hazırlanıyor
    const updateData = { status };

    // Eğer durum "Reddedildi" ise, rejectionReason da ekleniyor
    if (status === "Reddedildi") {
      updateData.rejectionReason = rejectionReason;
    } else {
      // Durum "Onaylandı" veya "Beklemede" olduğunda rejectionReason boş olarak kaydedilir
      updateData.rejectionReason = "";
    }

    // İzin talebini ID ile bul ve durumunu güncelle
    const updatedLeave = await Leave.findByIdAndUpdate(
      leaveId,
      updateData,
      { new: true, runValidators: true } // `new: true` yeni güncellenmiş dökümanı döndürür
    );

    const userId = leave.userId.toString(); // leave içindeki
    const ownerSocketId = onlineUsers[userId]; // Kullanıcının socket ID'si
    if (ownerSocketId) {
      req.io.to(ownerSocketId).emit("leaveStatusUpdated", {
        message: `İzin talebinizin durumu "${status}" olarak güncellendi.`,
        leave: updatedLeave,
      });
    } else {
      console.log(`User ${userId} is not connected.`);
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

const companyRegister = asyncErrorWrapper(async (req, res, next) => {
  const { name, location, contact } = req.body;

  const existingCompany = await CompanySc.findOne({ name });
  if (existingCompany) {
    return next(
      new CustumError(
        "This Company Name is already in use. Please try another Company.",
        400
      )
    );
  }

  await CompanySc.create({
    name,
    location,
    contact,
  });

  res.status(201).json({
    success: true,
    message: "Company registered successfully.",
  });
});

const companyGetAll = asyncErrorWrapper(async (req, res, next) => {
  // Tüm firmaları veritabanından çek
  const companies = await CompanySc.find();

  // Eğer firmalar varsa başarı mesajı ve firma listesi dön
  if (companies.length > 0) {
    return res.status(200).json({
      success: true,
      data: companies,
    });
  } else {
    // Eğer firmalar yoksa özel bir hata fırlat
    return next(new CustumError("Hiçbir firma bulunamadı.", 404));
  }
});

module.exports = {
  register,
  getAllUserAdmin,
  deleteUserAdmin,
  toggleBlockUser,
  announcement,
  getAllLeave,
  statusUpdate,
  companyRegister,
  companyGetAll,
};
