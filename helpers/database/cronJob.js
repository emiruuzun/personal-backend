const { CronJob } = require("cron");
const User = require("../../models/User");
const Leave = require("../../models/LeaveRequest");

const updateUserStatus = async (userId, status) => {
  await User.findByIdAndUpdate(userId, { status });
};

const updateLeaveStatus = async (leaveId, status) => {
  await Leave.findByIdAndUpdate(leaveId, { status });
};

const startStatusUpdateJob = () => {
  const job = new CronJob("*/10 * * * * *", async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const users = await User.find();

      for (let user of users) {
        const latestLeave = await Leave.findOne({ userId: user._id })
          .sort({ startDate: -1 })
          .limit(1);

        if (latestLeave) {
          // Eğer izin "Onaylandı" ve bitiş tarihi bugünden küçük veya eşitse kullanıcı "Aktif" yapılır
          if (
            latestLeave.status === "Onaylandı" &&
            latestLeave.endDate <= today
          ) {
            await updateUserStatus(user._id, "Aktif");
            await updateLeaveStatus(latestLeave._id, "Geçmiş İzin");
            console.log(
              `Kullanıcı ${user._id} için izin talebi "Geçmiş İzin" olarak güncellendi.`
            );
          }

          // Eğer izin "Onaylanmış (Yaklaşan)" ve başlangıç tarihi bugünden küçük veya eşitse kullanıcı "İzinli" yapılır
          if (
            latestLeave.status === "Onaylanmış (Yaklaşan)" &&
            latestLeave.startDate <= today
          ) {
            await updateUserStatus(user._id, "İzinli");
            await updateLeaveStatus(latestLeave._id, "Onaylandı");
            console.log(
              `Kullanıcı ${user._id} için izin talebi "Onaylandı" olarak güncellendi.`
            );
          }
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
