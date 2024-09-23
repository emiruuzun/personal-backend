const { CronJob } = require("cron");
const User = require("../../models/User");
const Leave = require("../../models/LeaveRequest");

const startStatusUpdateJob = () => {
  const job = new CronJob("0 0 * * *", async () => {
    try {
      // Bugünün yerel tarihini al ve saatlerini sıfırla
      const today = new Date();
      console.log(today);
      // Leave tablosundan endDate bugünden önce olan izinleri bul
      const expiredLeaves = await Leave.find({
        endDate: { $lt: today },
        status: "Onaylandı",
      });

      console.log(expiredLeaves);

      if (expiredLeaves.length > 0) {
        const userIdsToUpdate = expiredLeaves.map((leave) => leave.userId);

        // Bu kullanıcıların durumunu Aktif olarak güncelle
        const result = await User.updateMany(
          { _id: { $in: userIdsToUpdate }, status: "İzinli" },
          { $set: { status: "Aktif" } }
        );

        console.log(result);
        if (result.modifiedCount > 0) {
          console.log(
            `${result.modifiedCount} kullanıcının statüsü "Aktif" olarak güncellendi.`
          );
        } else {
          console.log("Güncellenmesi gereken kullanıcı bulunamadı.");
        }
      } else {
        console.log("Süresi dolmuş izin kaydı bulunamadı.");
      }
    } catch (error) {
      console.error("Bir hata oluştu:", error);
    }
  });

  job.start();
};

const startAllJobs = () => {
  startStatusUpdateJob();
};

module.exports = {
  startAllJobs,
};

// Altta ki kodda 30 saniyede bir
// '*/30 * * * * *'

// Her 24 satte saat 00:00 da
// '0 0 * * *'
