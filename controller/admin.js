const onlineUsers = require("../util/onlineUsers");
const CustumError = require("../helpers/error/CustumError");
const User = require("../models/User");
const DailyWorkRecord = require("../models/DailyWorkRecordSchema ");
const Leave = require("../models/LeaveRequest");
const sendEmail = require("../helpers/libraries/sendEmail");
const generateVerificationToken = require("../util/emailVefiyToken");
const Announcement = require("../models/Announcement");
const CompanySc = require("../models/CompanySchema ");
const asyncErrorWrapper = require("express-async-handler");

const register = asyncErrorWrapper(async (req, res, next) => {
  const {
    name,
    email,
    password,
    position,
    tcNo,
    contact,
    status,
    role,
    group,
  } = req.body;
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
    group,
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
const getLastLeaveByUserId = asyncErrorWrapper(async (req, res, next) => {
  const { userId } = req.body; // API'den gelen kullanıcı id'si

  try {
    // Belirtilen userId'ye ait tüm izinleri başlangıç tarihine göre sıralayıp son eklenen kaydı getir
    const lastLeave = await Leave.findOne({ userId })
      .sort({ createdAt: -1 }) // En son ekleneni bulmak için tarihe göre tersten sırala
      .select("startDate endDate"); // Sadece başlangıç ve bitiş tarihlerini seç

    if (!lastLeave) {
      return next(
        new CustumError("No leave requests found for this user", 404)
      );
    }

    res.status(200).json({
      success: true,
      data: {
        startDate: lastLeave.startDate,
        endDate: lastLeave.endDate,
      },
    });
  } catch (error) {
    console.error("Error fetching leave for user:", error);
    return next(
      new CustumError("An error occurred while fetching leave request", 500)
    );
  }
});

const statusUpdate = asyncErrorWrapper(async (req, res, next) => {
  const { leaveId, status, rejectionReason } = req.body;

  // Geçerli bir durum kontrolü
  const validStatuses = [
    "Onaylandı",
    "Reddedildi",
    "Beklemede",
    "Onaylanmış (Yaklaşan)",
  ];
  if (!validStatuses.includes(status)) {
    return next(new CustomError("Geçersiz durum değeri.", 400));
  }

  try {
    // İzin talebini bul
    const leave = await Leave.findById(leaveId);

    // Eğer izin talebi bulunamazsa hata fırlat
    if (!leave) {
      return next(new CustomError("İzin talebi bulunamadı.", 404));
    }

    // Eğer izin talebi zaten "Onaylandı" veya "Reddedildi" ise güncelleme yapılmasın
    if (
      ["Onaylandı", "Reddedildi", "Onaylanmış (Yaklaşan)"].includes(
        leave.status
      )
    ) {
      return next(
        new CustomError(
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
      return next(new CustomError("Reddetme nedeni belirtilmelidir.", 400));
    }

    // Güncelleme verisi hazırlanıyor
    let updateData = { status };

    // Eğer durum "Reddedildi" ise, rejectionReason da ekleniyor
    if (status === "Reddedildi") {
      updateData.rejectionReason = rejectionReason;
    } else {
      // Durum "Onaylandı" veya "Beklemede" olduğunda rejectionReason boş olarak kaydedilir
      updateData.rejectionReason = "";
    }

    // Eğer izin talebi onaylandıysa, izin başlangıç tarihine göre statüleri güncelle
    if (status === "Onaylandı") {
      const today = new Date();
      const startDate = new Date(leave.startDate);

      if (startDate > today) {
        // İzin başlangıç tarihi gelecekteyse, izin talebinin statüsünü "Onaylanmış (Yaklaşan)" yapın
        updateData.status = "Onaylanmış (Yaklaşan)";
      } else if (startDate.toDateString() === today.toDateString()) {
        // İzin başlangıç tarihi bugüne eşitse, kullanıcının statüsünü "İzinli" yapın
        await User.findByIdAndUpdate(leave.userId, { status: "İzinli" });
      } else {
        // Geçmiş tarihli izinler için izin talebinin statüsünü "Geçmiş İzin" yapabilirsiniz
        updateData.status = "Geçmiş İzin";
      }
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
        message: `İzin talebinizin durumu "${updateData.status}" olarak güncellendi.`,
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
const addDailyWorkRecord = asyncErrorWrapper(async (req, res, next) => {
  const {
    personnel_id,
    company_id,
    job_id, // İş ID'si
    date,
    job_start_time,
    job_end_time,
    overtime_hours,
    notes,
  } = req.body;

  function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  }

  if (!isValidDate(date)) {
    return next(new CustumError("Geçersiz tarih formatı.", 400));
  }

  const isAssigned = !!company_id && !!job_id;

  if (!personnel_id || !date) {
    return next(new CustumError("Personel ID ve Tarih zorunludur.", 400));
  }

  if (isAssigned && !job_start_time) {
    return next(
      new CustumError(
        "İş ataması yapılan personel için İş Başlangıç Saati zorunludur.",
        400
      )
    );
  }

  const existingRecord = await DailyWorkRecord.findOne({ personnel_id, date });

  let newRecord;

  if (existingRecord) {
    existingRecord.company_id = company_id;
    existingRecord.job_id = job_id;
    existingRecord.isAssigned = isAssigned;
    existingRecord.job_start_time = job_start_time;
    existingRecord.job_end_time = job_end_time;
    existingRecord.overtime_hours = overtime_hours;
    existingRecord.notes = notes;

    newRecord = await existingRecord.save();
  } else {
    newRecord = await DailyWorkRecord.create({
      personnel_id,
      company_id,
      job_id,
      date,
      isAssigned,
      job_start_time,
      job_end_time,
      overtime_hours,
      notes,
    });
  }

  if (isAssigned) {
    await DailyWorkRecord.updateMany(
      {
        personnel_id: personnel_id,
        date: date,
        _id: { $ne: newRecord._id },
      },
      {
        $set: {
          isAssigned: false,
          company_id: null,
          job_id: null, // İş ataması sıfırlanıyor
        },
      }
    );
  }

  res.status(201).json({
    success: true,
    message: "Günlük iş kaydı başarıyla oluşturuldu veya güncellendi.",
    data: newRecord,
  });
});

const updateDailyWorkRecord = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.params; // Güncelleme yapılacak kaydın ID'si
  const { company_id, job_start_time, job_end_time, overtime_hours, notes } =
    req.body;

  // Kayıt var mı kontrol et
  const record = await DailyWorkRecord.findById(id);
  if (!record) {
    return next(new CustumError("Günlük iş kaydı bulunamadı.", 404));
  }

  // isAssigned alanını güncelleme
  let isAssigned = record.isAssigned;
  if (company_id !== undefined) {
    isAssigned = !!company_id; // company_id varsa true, yoksa false
  }

  // Alanları güncelle
  record.company_id = company_id !== undefined ? company_id : record.company_id;
  record.isAssigned = isAssigned;
  record.job_start_time =
    job_start_time !== undefined ? job_start_time : record.job_start_time;
  record.job_end_time =
    job_end_time !== undefined ? job_end_time : record.job_end_time;

  // Overtime hours güncellenmesi
  if (overtime_hours) {
    record.overtime_hours.start_time =
      overtime_hours.startTime || record.overtime_hours.start_time;
    record.overtime_hours.end_time =
      overtime_hours.endTime || record.overtime_hours.end_time;
  }

  record.notes = notes !== undefined ? notes : record.notes;

  // Validasyon kontrolü
  if (record.isAssigned && !record.job_start_time) {
    return next(
      new CustumError(
        "İş ataması yapılan personel için İş Başlangıç Saati zorunludur.",
        400
      )
    );
  }

  await record.save();

  res.status(200).json({
    success: true,
    message: "Günlük iş kaydı başarıyla güncellendi.",
    data: record,
  });
});

const getDailyWorkRecords = asyncErrorWrapper(async (req, res, next) => {
  const { date } = req.query;

  if (!date) {
    return next(new CustumError("Date parameter is required.", 400));
  }

  // Tarih aralığını belirleyin
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0); // Günün başlangıcı
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999); // Günün sonu

  try {
    // O tarihe ait atanmış personelleri ve atanmamış personelleri çek
    const assignedRecords = await DailyWorkRecord.find({
      date: { $gte: startOfDay, $lte: endOfDay }, // Tarih aralığına göre sorgula
      isAssigned: true,
    }).populate("personnel_id", "name");

    const unassignedRecords = await DailyWorkRecord.find({
      date: { $gte: startOfDay, $lte: endOfDay }, // Tarih aralığına göre sorgula
      isAssigned: false,
    }).populate("personnel_id", "name");

    res.status(200).json({
      success: true,
      data: {
        assigned: assignedRecords,
        unassigned: unassignedRecords,
      },
    });
  } catch (error) {
    console.error("Veritabanı hatası:", error);
    return next(
      new CustumError(
        "An error occurred while fetching daily work records.",
        500
      )
    );
  }
});
const deleteDailyWorkRecord = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.params;

  // Silinecek kayıt var mı kontrol et
  const record = await DailyWorkRecord.findById(id);
  if (!record) {
    return next(new CustumError("Günlük iş kaydı bulunamadı.", 404));
  }

  // Kaydı sil
  await DailyWorkRecord.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Günlük iş kaydı başarıyla silindi.",
  });
});
const getWorkRecordsByDateRange = asyncErrorWrapper(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(
      new CustumError(
        "Both startDate and endDate parameters are required.",
        400
      )
    );
  }

  // Tarih aralığını belirleyin
  const startOfDay = new Date(startDate);
  startOfDay.setHours(0, 0, 0, 0); // Başlangıç günün ilk saati
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999); // Bitiş günün son saati

  try {
    // Verilen tarih aralığına göre atanmış ve atanmamış iş kayıtlarını çek
    const assignedRecords = await DailyWorkRecord.find({
      date: { $gte: startOfDay, $lte: endOfDay }, // Tarih aralığına göre sorgula
      isAssigned: true,
    })
      .populate("personnel_id", "name")
      .populate({
        path: "company_id",
        select: "name jobs", // Hem şirket ismini hem de iş listesini seç
        populate: {
          path: "jobs", // 'jobs' alanı içerisinde referans verilen 'Job' koleksiyonunu populate et
          select: "jobName", // Sadece işin ismini al
        },
      });

    const unassignedRecords = await DailyWorkRecord.find({
      date: { $gte: startOfDay, $lte: endOfDay }, // Tarih aralığına göre sorgula
      isAssigned: false,
    }).populate("personnel_id", "name");

    res.status(200).json({
      success: true,
      data: {
        assigned: assignedRecords,
        unassigned: unassignedRecords,
      },
    });
  } catch (error) {
    console.error("Veritabanı hatası:", error); // Daha detaylı hata loglayın
    return next(
      new CustumError(
        "An error occurred while fetching work records by date range.",
        500
      )
    );
  }
});
const deleteCompany = asyncErrorWrapper(async (req, res, next) => {
  const { id } = req.params;

  const companySc = await CompanySc.findById(id);

  if (!companySc) {
    return next(new CustumError("There is no such user with that id", 404));
  }

  await CompanySc.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: "Company and their answers deleted successfully",
  });
});

const addJobToCompany = asyncErrorWrapper(async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { jobName, jobDescription } = req.body; // Değerlerin doğru alındığından emin olun

    if (!jobName) {
      return res
        .status(400)
        .json({ success: false, message: "İş adı gerekli." });
    }

    const company = await CompanySc.findById(companyId);

    if (!company) {
      return res
        .status(404)
        .json({ success: false, message: "Firma bulunamadı." });
    }

    company.jobs.push({ jobName, jobDescription }); // Yeni iş verilerini ekleyin
    await company.save();

    res
      .status(200)
      .json({ success: true, message: "İş başarıyla eklendi.", data: company });
  } catch (error) {
    console.error("İş ekleme hatası:", error);
    res
      .status(500)
      .json({ success: false, message: "İş eklenirken bir hata oluştu." });
  }
});
const getJobsByCompany = asyncErrorWrapper(async (req, res, next) => {
  const { companyId } = req.params;

  const company = await CompanySc.findById(companyId);

  if (!company) {
    return res
      .status(404)
      .json({ success: false, message: "Firma bulunamadı." });
  }

  res.status(200).json({
    success: true,
    data: company.jobs, // Firmanın işlerini döndür
  });
});

const completeJob = asyncErrorWrapper(async (req, res, next) => {
  const { companyId, jobId } = req.params;

  const company = await CompanySc.findById(companyId);

  if (!company) {
    return next(new CustumError("There is no such company with that id", 400));
  }

  const job = company.jobs.id(jobId);

  if (!job) {
    return next(new CustumError("There is no such job with that id", 400));
  }

  job.status = "completed";
  await company.save();

  res.status(200).json({
    success: true,
    message: "Job has been completed successfully",
    data: job,
  });
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
  addDailyWorkRecord,
  updateDailyWorkRecord,
  getDailyWorkRecords,
  deleteDailyWorkRecord,
  getWorkRecordsByDateRange,
  getLastLeaveByUserId,
  deleteCompany,
  addJobToCompany,
  getJobsByCompany,
  completeJob,
};
