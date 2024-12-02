const onlineUsers = require("../util/onlineUsers");
const CustumError = require("../helpers/error/CustumError");
const User = require("../models/User");
const Activity = require("../models/ActivitySchema ");
const DailyWorkRecord = require("../models/DailyWorkRecordSchema ");
const Leave = require("../models/LeaveRequest");
const OldLeave = require("../models/OldLeaveSchema");
const OldStaff = require("../models/OldStaffSchema");
const OldBusinessRecords = require("../models/OldBusinessRecordsSchema ");
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
    subgroup,
    employmentType,
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

  // Subgroup sadece Taşeron grubunda olmalıdır
  const userData = {
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
    employmentType,

    isVerify: process.env.NODE_ENV === "development",
  };

  if (group === "Taşeron" && subgroup) {
    userData.subgroup = subgroup; // Taşeron grubunda ise subgroup ekleniyor
  }

  const user = await User.create(userData);

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

  // Aktivite kaydetme
  const activity = new Activity({
    type: "user_registration",
    description: `Yeni kullanıcı kaydı: ${user.name}`,
  });
  await activity.save();

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

  // Kullanıcının izinlerini al
  const userLeaves = await Leave.find({ userId: id });

  // Kullanıcının günlük iş kayıtlarını al
  const userWorkRecords = await DailyWorkRecord.find({ personnel_id: id });

  // Arşivleme işlemleri
  try {
    // Kullanıcıyı OldStaff'a taşı
    const oldStaff = new OldStaff({
      originalUserId: user._id,
      name: user.name,
      email: user.email,
      group: user.group,
      position: user.position,
      status: user.status,
      archivedAt: new Date(),
      tcNo: user.tcNo,
      contact: user.contact,
      role: user.role,
      subgroup: user.subgroup || null,
    });
    await oldStaff.save();

    // İzinleri arşivle
    for (const leave of userLeaves) {
      const oldLeave = new OldLeave({
        personnel_id: oldStaff._id, // Eski personel referansı
        fullName: leave.fullName || user.name,
        position: leave.position || user.position,
        periodYear: leave.periodYear || new Date(leave.startDate).getFullYear(),
        tcNo: leave.tcNo || user.tcNo,
        leaveType: leave.leaveType,
        startDate: leave.startDate,
        endDate: leave.endDate,
        leaveDays: leave.leaveDays,
        contactNumber: leave.contactNumber || user.contact,
        reason: leave.reason,
        status: leave.status,
        rejectionReason: leave.rejectionReason || "",
        createdAt: leave.createdAt || new Date(),
        archivedAt: new Date(),
      });
      await oldLeave.save();
    }

    // İş kayıtlarını arşivle
    for (const record of userWorkRecords) {
      const oldRecord = new OldBusinessRecords({
        personnel_id: oldStaff._id, // Eski personel referansı
        company_id: record.company_id || null,
        job_id: record.job_id || null,
        date: record.date || null,
        isAssigned: record.isAssigned || false,
        job_start_time: record.job_start_time || null,
        job_end_time: record.job_end_time || null,
        overtime_hours: record.overtime_hours || {},
        notes: record.notes || "",
        archivedAt: new Date(),
      });
      await oldRecord.save();
    }

    // Kullanıcıyı ve ilişkili kayıtlarını sil
    await User.findByIdAndDelete(id);
    await Leave.deleteMany({ userId: id });
    await DailyWorkRecord.deleteMany({ personnel_id: id });

    res.status(200).json({
      success: true,
      message:
        "User and related records have been successfully deleted and archived.",
    });
  } catch (error) {
    console.error("Error during deletion and archiving:", error);
    return next(
      new CustumError(
        "An error occurred while deleting and archiving records.",
        500
      )
    );
  }
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
    if (
      ["Onaylandı", "Reddedildi", "Onaylanmış (Yaklaşan)"].includes(
        leave.status
      )
    ) {
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

  const newCompany = await CompanySc.create({
    name,
    location,
    contact,
  });

  // Aktivite kaydetme işlemi
  const activity = new Activity({
    type: "company_added",
    description: `Yeni şirket eklendi: ${newCompany.name}`, // Şirket ismi açıklamada yer alır
  });
  await activity.save();

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

  // Personelin izinli olup olmadığını kontrol et
  const user = await User.findById(personnel_id);

  if (!user) {
    return next(new CustumError("Personel bulunamadı.", 404));
  }

  // Personel izinliyse ve iş ataması yapılıyorsa, izin dönüşü iş planlandığını belirten bir mesaj ekle
  if (user.status === "İzinli") {
    const leave = await Leave.findOne({
      userId: personnel_id,
      status: "Onaylandı",
    })
      .sort({ endDate: -1 })
      .limit(1);

    if (leave) {
      const leaveEndDate = new Date(leave.endDate).toLocaleDateString("tr-TR");
      const jobAfterLeaveMessage = `İzin dönüşü ${leaveEndDate} tarihinde planlanmış bir iş var.`;
      user.assignedAfterLeaveInfo = jobAfterLeaveMessage; // Mesaj ekleniyor
    }

    await user.save(); // Güncellenmiş user verisini kaydediyoruz
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
    // Güncel atanmış ve atanmamış iş kayıtlarını çek
    const assignedRecords = await DailyWorkRecord.find({
      date: { $gte: startOfDay, $lte: endOfDay }, // Tarih aralığına göre sorgula
      isAssigned: true,
    }).populate("personnel_id", "name");

    const unassignedRecords = await DailyWorkRecord.find({
      date: { $gte: startOfDay, $lte: endOfDay }, // Tarih aralığına göre sorgula
      isAssigned: false,
    }).populate("personnel_id", "name");

    // Eski iş kayıtlarını çek
    const archivedRecords = await OldBusinessRecords.find({
      date: { $gte: startOfDay, $lte: endOfDay }, // Tarih aralığına göre sorgula
    }).populate("personnel_id", "name");
    // Eski kayıtları atanmış ve atanmamış olarak ayır
    const archivedAssignedRecords = archivedRecords.filter(
      (record) => record.isAssigned
    );
    const archivedUnassignedRecords = archivedRecords.filter(
      (record) => !record.isAssigned
    );

    // Güncel ve eski kayıtları birleştir
    const combinedAssignedRecords = [
      ...assignedRecords.map((record) => ({
        ...record.toObject(),
        isArchived: false, // Güncel kayıt
      })),
      ...archivedAssignedRecords.map((record) => ({
        ...record.toObject(),
        isArchived: true, // Eski kayıt
      })),
    ];

    const combinedUnassignedRecords = [
      ...unassignedRecords.map((record) => ({
        ...record.toObject(),
        isArchived: false, // Güncel kayıt
      })),
      ...archivedUnassignedRecords.map((record) => ({
        ...record.toObject(),
        isArchived: true, // Eski kayıt
      })),
    ];

    // Birleştirilmiş kayıtları döndür
    res.status(200).json({
      success: true,
      data: {
        assigned: combinedAssignedRecords,
        unassigned: combinedUnassignedRecords,
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

    // Eski iş kayıtlarını da al
    const archivedAssignedRecords = await OldBusinessRecords.find({
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

    const archivedUnassignedRecords = await OldBusinessRecords.find({
      date: { $gte: startOfDay, $lte: endOfDay }, // Tarih aralığına göre sorgula
      isAssigned: false,
    }).populate("personnel_id", "name");

    res.status(200).json({
      success: true,
      data: {
        assigned: [...assignedRecords, ...archivedAssignedRecords],
        unassigned: [...unassignedRecords, ...archivedUnassignedRecords],
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

    // Yeni iş ekleme
    company.jobs.push({ jobName, jobDescription }); // Yeni iş verilerini ekleyin
    await company.save();

    // Aktivite kaydetme işlemi
    const activity = new Activity({
      type: "job_added",
      description: `Yeni iş eklendi: ${jobName} - ${company.name}`, // İş ve firma ismini kullanarak açıklama oluşturuyoruz
    });
    await activity.save();

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
const getAllJobsByCompanies = asyncErrorWrapper(async (req, res, next) => {
  // Tüm firmaları çekiyoruz
  const companies = await CompanySc.find();

  if (!companies || companies.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Hiçbir firma bulunamadı." });
  }

  // İşleri active ve completed olarak ayırmak için boş diziler oluşturuyoruz
  const activeJobs = [];
  const completedJobs = [];

  // Her firmayı ve firmanın işlerini döngüyle işliyoruz
  companies.forEach((company) => {
    company.jobs.forEach((job) => {
      if (job.status === "active") {
        activeJobs.push({
          companyId: company._id,
          companyName: company.name,
          jobName: job.jobName,
          jobDescription: job.jobDescription,
          status: job.status,
        });
      } else if (job.status === "completed") {
        completedJobs.push({
          companyId: company._id,
          companyName: company.name,
          jobName: job.jobName,
          jobDescription: job.jobDescription,
          status: job.status,
        });
      }
    });
  });

  // Sonuçları active ve completed olarak JSON formatında döndürüyoruz
  res.status(200).json({
    success: true,
    activeJobs,
    completedJobs,
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

  // Aktivite kaydetme işlemi
  const activity = new Activity({
    type: "task_completion",
    description: `Görev tamamlandı: ${job.jobName} - ${company.name}`, // İş ve firma ismini kullanarak açıklama oluşturuyoruz
  });
  await activity.save();

  res.status(200).json({
    success: true,
    message: "Job has been completed successfully",
    data: job,
  });
});

const getRecentActivities = asyncErrorWrapper(async (req, res, next) => {
  try {
    const activities = await Activity.find().sort({ date: -1 }).limit(4); // Son 4 aktiviteyi getir
    res.status(200).json({ success: true, activities });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Son aktiviteler alınamadı." });
  }
});

const getMonthlyReport = asyncErrorWrapper(async (req, res, next) => {
  const { month, year } = req.query;

  if (!month || !year || isNaN(month) || isNaN(year)) {
    return res.status(400).json({
      success: false,
      message: "Both month and year are required as valid numbers.",
    });
  }

  const adjustedMonth = parseInt(month, 10) - 1;
  const startDate = new Date(year, adjustedMonth, 1);
  const endDate = new Date(year, adjustedMonth + 1, 0);

  try {
    // Fetch work records (DailyWorkRecord)
    const workRecords = await DailyWorkRecord.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("personnel_id", "name group employmentType")
      .populate("company_id", "name")
      .lean();

    // Fetch leave records (Leave)
    const leaveRecords = await Leave.find({
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      status: { $in: ["Onaylandı", "Geçmiş İzin"] },
    });

    // Fetch archived work records (OldBusinessRecords)
    const archivedWorkRecords = await OldBusinessRecords.find({
      date: { $gte: startDate, $lte: endDate },
    })
      .populate("personnel_id", "name group employmentType")
      .populate("company_id", "name")
      .lean();

    // Fetch archived leave records (OldLeave)
    const archivedLeaveRecords = await OldLeave.find({
      startDate: { $lte: endDate },
      endDate: { $gte: startDate },
      status: { $in: ["Onaylandı", "Geçmiş İzin"] },
    });

    // Map leave records by user
    const leaveDaysByUser = leaveRecords.reduce((acc, leave) => {
      const leaveDays = leave.leaveDays || 0;
      const leaveType = leave.leaveType || "Bilinmiyor";
      const userId = leave.userId?.toString();
      if (!userId) {
        return acc;
      }

      if (!acc[userId]) {
        acc[userId] = {
          totalLeaveDays: 0,
          leaveTypes: {},
        };
      }

      acc[userId].totalLeaveDays += leaveDays;
      acc[userId].leaveTypes[leaveType] =
        (acc[userId].leaveTypes[leaveType] || 0) + leaveDays;

      return acc;
    }, {});

    // Arşivlenmiş izin kayıtları için
    const archivedLeaveDaysByUser = archivedLeaveRecords.reduce(
      (acc, leave) => {
        const leaveDays = leave.leaveDays || 0;
        const leaveType = leave.leaveType || "Bilinmiyor";
        const userId = leave.personnel_id?.toString();
        if (!userId) {
          return acc;
        }

        if (!acc[userId]) {
          acc[userId] = {
            totalLeaveDays: 0,
            leaveTypes: {},
          };
        }

        acc[userId].totalLeaveDays += leaveDays;
        acc[userId].leaveTypes[leaveType] =
          (acc[userId].leaveTypes[leaveType] || 0) + leaveDays;

        return acc;
      },
      {}
    );

    // Map work records by user
    const workingDaysByUser = workRecords.reduce((acc, record) => {
      const userId = record.personnel_id?._id?.toString();
      const employmentType = record.personnel_id?.employmentType;

      if (!userId) {
        return acc;
      }

      if (record.company_id && record.job_start_time && record.job_end_time) {
        const workDate = new Date(record.date);
        const workDay = workDate.getDay();
        const workDateStr = workDate.toDateString();

        if (!acc[userId]) {
          acc[userId] = {
            total: new Set(),
            weekdays: new Set(),
            weekends: new Set(),
          };
        }

        acc[userId].total.add(workDateStr);

        // Mavi yaka için sadece Pazar (0) hafta sonu
        if (employmentType === "mavi yaka") {
          if (workDay === 0) {
            // Sadece Pazar
            acc[userId].weekends.add(workDateStr);
          } else {
            acc[userId].weekdays.add(workDateStr);
          }
        }
        // Beyaz yaka için Cumartesi (6) ve Pazar (0) hafta sonu
        else {
          if (workDay === 0 || workDay === 6) {
            acc[userId].weekends.add(workDateStr);
          } else {
            acc[userId].weekdays.add(workDateStr);
          }
        }
      }
      return acc;
    }, {});

    // Map archived work records by user
    const archivedWorkingDaysByUser = archivedWorkRecords.reduce(
      (acc, record) => {
        const userId = record.personnel_id?._id?.toString();
        const employmentType = record.personnel_id?.employmentType;

        if (!userId) {
          return acc;
        }

        if (record.company_id && record.job_start_time && record.job_end_time) {
          const workDate = new Date(record.date);
          const workDay = workDate.getDay();
          const workDateStr = workDate.toDateString();

          if (!acc[userId]) {
            acc[userId] = {
              total: new Set(),
              weekdays: new Set(),
              weekends: new Set(),
            };
          }

          acc[userId].total.add(workDateStr);

          // Mavi yaka için sadece Pazar (0) hafta sonu
          if (employmentType === "mavi yaka") {
            if (workDay === 0) {
              // Sadece Pazar
              acc[userId].weekends.add(workDateStr);
            } else {
              acc[userId].weekdays.add(workDateStr);
            }
          }
          // Beyaz yaka için Cumartesi (6) ve Pazar (0) hafta sonu
          else {
            if (workDay === 0 || workDay === 6) {
              acc[userId].weekends.add(workDateStr);
            } else {
              acc[userId].weekdays.add(workDateStr);
            }
          }
        }
        return acc;
      },
      {}
    );

    // Combine both current and archived work and leave data
    const enrichedWorkRecords = [...workRecords, ...archivedWorkRecords]
      .map((record) => {
        const userId = record.personnel_id?._id?.toString();

        if (!userId) {
          console.warn(
            "Skipping record due to missing personnel_id:",
            record._id
          );
          return null;
        }

        const leaveDays =
          leaveDaysByUser[userId] || archivedLeaveDaysByUser[userId] || 0;
        const totalWorkingDays = workingDaysByUser[userId]
          ? workingDaysByUser[userId].total.size
          : archivedWorkingDaysByUser[userId]
          ? archivedWorkingDaysByUser[userId].total.size
          : 0;

        const totalWorkingWeekdays = workingDaysByUser[userId]
          ? workingDaysByUser[userId].weekdays.size
          : archivedWorkingDaysByUser[userId]
          ? archivedWorkingDaysByUser[userId].weekdays.size
          : 0;

        const totalWorkingWeekends = workingDaysByUser[userId]
          ? workingDaysByUser[userId].weekends.size
          : archivedWorkingDaysByUser[userId]
          ? archivedWorkingDaysByUser[userId].weekends.size
          : 0;

        return {
          ...record,
          personnel_id: {
            ...record.personnel_id,
            leaveDays,
            totalWorkingDays,
            totalWorkingWeekdays,
            totalWorkingWeekends,
            isArchived: record.archivedAt ? true : false,
          },
        };
      })
      .filter((record) => record !== null);

    // Send response
    res.status(200).json({
      success: true,
      data: enrichedWorkRecords,
    });
  } catch (error) {
    console.error("Error in getMonthlyReport:", error.message, error.stack);
    res.status(500).json({
      success: false,
      message: "Error fetching monthly report.",
    });
  }
});

const leaveCreate = asyncErrorWrapper(async (req, res, next) => {
  const { userId, startDate, endDate, leaveType, reason, leaveDays } = req.body;

  // Eksik alan kontrolü
  if (
    !userId ||
    !startDate ||
    !endDate ||
    !leaveType ||
    !reason ||
    !leaveDays
  ) {
    return next(new CustumError("All required fields must be provided", 400));
  }

  // Kullanıcıyı veritabanından getir
  const user = await User.findById(userId);

  if (!user) {
    return next(new CustumError("User not found", 404));
  }

  // Tarihleri kontrol et
  const today = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start > end) {
    return next(
      new CustumError("Start date cannot be after the end date", 400)
    );
  }

  // Backend'de kullanıcı bilgilerini doldur
  let leaveData = {
    userId: user._id,
    fullName: user.name,
    position: user.position,
    tcNo: user.tcNo,
    contactNumber: user.contact,
    periodYear: new Date().getFullYear(),
    leaveType,
    startDate,
    endDate,
    leaveDays,
    reason,
    status: "Onaylandı",
  };

  // Kullanıcı durumunu güncelle
  if (start > today) {
    // İzin başlangıç tarihi gelecekteyse
    leaveData.status = "Onaylanmış (Yaklaşan)";
  } else if (start <= today && end >= today) {
    // İzin başlangıç tarihi geçmişte veya bugündeyse
    await User.findByIdAndUpdate(userId, { status: "İzinli" });
  } else if (end < today) {
    // İzin bitiş tarihi geçmişteyse
    leaveData.status = "Geçmiş İzin";
  }

  // Leave kaydı oluştur
  const leave = await Leave.create(leaveData);

  res.status(200).json({
    success: true,
    data: leave,
    message: "Leave created and user status updated if applicable.",
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
  getAllJobsByCompanies,
  getRecentActivities,
  getMonthlyReport,
  leaveCreate,
};
