const { CronJob } = require("cron");
const User = require("../../models/User");
const Leave = require("../../models/LeaveRequest");

const updateUserStatus = async (userId, status) => {
  try {
    return await User.findByIdAndUpdate(userId, { status }, { new: true });
  } catch (error) {
    throw new Error(
      `Kullanıcı statüsü güncellenirken hata oluştu: ${error.message}`
    );
  }
};
const updateAssignedAfterLeaveInfo = async (userId, info) => {
  try {
    await User.updateOne(
      { _id: userId },
      { $set: { assignedAfterLeaveInfo: info } }
    );
  } catch (error) {
    throw new Error(
      `assignedAfterLeaveInfo alanı güncellenirken hata oluştu: ${error.message}`
    );
  }
};

const updateLeaveStatus = async (leaveId, status) => {
  try {
    return await Leave.findByIdAndUpdate(leaveId, { status }, { new: true });
  } catch (error) {
    throw new Error(
      `İzin statüsü güncellenirken hata oluştu: ${error.message}`
    );
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
          status: { $in: ["Onaylandı", "Onaylanmış (Yaklaşan)", "Beklemede"] },
        })
          .sort({ startDate: -1 })
          .limit(1);

        if (latestLeave && latestLeave.length > 0) {
          const leave = latestLeave[0];

          const leaveEndDate = new Date(
            Date.UTC(
              leave.endDate.getUTCFullYear(),
              leave.endDate.getUTCMonth(),
              leave.endDate.getUTCDate()
            )
          );

          // Eğer izin "Onaylandı" ve bitiş tarihi bugüne eşitse veya bugünden küçükse kullanıcı "Aktif" yapılır
          if (leave.status === "Onaylandı" && leaveEndDate <= today) {
            await updateUserStatus(user._id, "Aktif");
            await updateAssignedAfterLeaveInfo(user._id, "");
            await updateLeaveStatus(leave._id, "Geçmiş İzin");
          }

          // Eğer izin "Onaylanmış (Yaklaşan)" ve başlangıç tarihi bugüne eşitse kullanıcı "İzinli" yapılır
          if (
            leave.status === "Onaylanmış (Yaklaşan)" &&
            leave.startDate <= today
          ) {
            await updateUserStatus(user._id, "İzinli");
            await updateLeaveStatus(leave._id, "Onaylandı");
          }
        }
      }
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
