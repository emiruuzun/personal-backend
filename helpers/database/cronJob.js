const { CronJob } = require("cron");
const User = require("../../models/User");
const Leave = require("../../models/LeaveRequest");
const updateUserStatus = async (userId, status) => {
  try {
    const result = await User.findByIdAndUpdate(
      userId,
      { status },
      { new: true }
    );
    if (result) {
      console.log(
        `Kullanıcı ${userId} statüsü "${status}" olarak güncellendi:`,
        result
      );
    } else {
      console.error(`Kullanıcı ${userId} güncellenemedi, null döndü.`);
    }
    return result;
  } catch (error) {
    console.error(
      `Kullanıcı statüsü güncellenirken hata oluştu: ${error.message}`
    );
    throw error;
  }
};

const updateLeaveStatus = async (leaveId, status) => {
  try {
    const result = await Leave.findByIdAndUpdate(
      leaveId,
      { status },
      { new: true }
    );
    if (result) {
      console.log(
        `İzin ${leaveId} statüsü "${status}" olarak güncellendi:`,
        result
      );
    } else {
      console.error(`İzin ${leaveId} güncellenemedi, null döndü.`);
    }
    return result;
  } catch (error) {
    console.error(`İzin statüsü güncellenirken hata oluştu: ${error.message}`);
    throw error;
  }
};
const startStatusUpdateJob = () => {
  const job = new CronJob("*/10 * * * * *", async () => {
    try {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      const users = await User.find();

      for (let user of users) {
        const latestLeave = await Leave.find({
          userId: user._id,
          status: { $in: ["Onaylandı", "Onaylanmış (Yaklaşan)", "Beklemede"] }
        })
          .sort({ startDate: -1 })
          .limit(1);

        if (latestLeave && latestLeave.length > 0) {
          const leave = latestLeave[0];
          console.log("Bulunan İzin:", leave);

          const leaveEndDate = new Date(
            Date.UTC(
              leave.endDate.getUTCFullYear(),
              leave.endDate.getUTCMonth(),
              leave.endDate.getUTCDate()
            )
          );

          console.error("leaveEndDate (Adjusted):", leaveEndDate);
          console.error("today (Adjusted):", today);

          // Eğer izin "Onaylandı" ve bitiş tarihi bugüne eşitse veya bugünden küçükse kullanıcı "Aktif" yapılır
          if (leave.status === "Onaylandı" && leaveEndDate <= today) {
            const userUpdateResult = await updateUserStatus(user._id, "Aktif");
            const leaveUpdateResult = await updateLeaveStatus(leave._id, "Geçmiş İzin");

            if (userUpdateResult && leaveUpdateResult) {
              console.log(
                `Kullanıcı ${user._id} için izin talebi "Geçmiş İzin" olarak güncellendi.`
              );
            } else {
              console.error("Kullanıcı veya izin güncellemesinde bir sorun oluştu.");
            }
          }

          // Eğer izin "Onaylanmış (Yaklaşan)" ve başlangıç tarihi bugüne eşitse kullanıcı "İzinli" yapılır
          if (leave.status === "Onaylanmış (Yaklaşan)" && leave.startDate <= today) {
            const userUpdateResult = await updateUserStatus(user._id, "İzinli");
            const leaveUpdateResult = await updateLeaveStatus(leave._id, "Onaylandı");

            if (userUpdateResult && leaveUpdateResult) {
              console.log(
                `Kullanıcı ${user._id} için izin talebi "Onaylandı" olarak güncellendi.`
              );
            } else {
              console.error("Kullanıcı veya izin güncellemesinde bir sorun oluştu.");
            }
          }
        } else {
          console.log(`User ID: ${user._id}, herhangi bir geçerli izin talebi bulunamadı.`);
        }
      }

      console.log("Tüm kullanıcıların izin işlemleri tamamlandı.");
    } catch (error) {
      console.error("Bir hata oluştu:", error);
    }
  });

  job.start();
};

const startLeaveStatusUpdateJob = () => {
  const job = new CronJob("*/10 * * * * *", async () => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const startingLeaves = await Leave.find({
        startDate: { $gte: todayStart, $lte: todayEnd },
        status: "Onaylanmış (Yaklaşan)",
      });

      if (startingLeaves.length > 0) {
        const userIdsToUpdate = startingLeaves.map((leave) => leave.userId);

        await updateUserStatus(userIdsToUpdate, "İzinli");
        await updateLeaveStatus(
          startingLeaves.map((leave) => leave._id),
          "Onaylandı"
        );

        console.log(
          `${startingLeaves.length} kullanıcının statüsü "İzinli" olarak güncellendi.`
        );
      } else {
        console.log("Bugün başlayan izin bulunamadı.");
      }
    } catch (error) {
      console.error("Bir hata oluştu:", error);
    }
  });

  job.start();
};

const startAllJobs = () => {
  startStatusUpdateJob();
  startLeaveStatusUpdateJob();
};

module.exports = {
  startAllJobs,
};

// Notlar:
// 1. startStatusUpdateJob: Bu cron job, her kullanıcı için en son izin talebini kontrol eder. Eğer izin "Onaylandı" ve bitiş tarihi bugünden küçük veya eşitse, kullanıcının statüsünü "Aktif" yapar. Eğer izin "Onaylanmış (Yaklaşan)" ve bugünkü tarihe eşitse, kullanıcının statüsünü "İzinli" yapar.
// 2. startLeaveStatusUpdateJob: Bu cron job, her 10 saniyede bir "Onaylanmış (Yaklaşan)" statüsündeki izinleri kontrol eder ve bugünkü tarihe eşitse statüsünü "Onaylandı" olarak günceller.

// Altta ki kodda 30 saniyede bir
// '*/30 * * * * *'

// Her 24 satte saat 00:00 da
// '0 0 * * *'
