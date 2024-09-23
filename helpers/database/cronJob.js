const { CronJob } = require("cron");
const User = require("../../models/User");

const startStatusUpdateJob = () => {
  const job = new CronJob("0 0 * * *", async () => {
    // Her gece 00:00'da çalışacak
    try {
      const today = new Date().toISOString().split("T")[0];

      const result = await User.updateMany(
        { leaveEndDate: { $lt: today }, status: "İzinli" },
        { $set: { status: "Aktif" } }
      );

      if (result.nModified > 0) {
        console.log(
          `${result.nModified} kullanıcının statüsü "Aktif" olarak güncellendi.`
        );
      } else {
        console.log("Güncellenmesi gereken kullanıcı bulunamadı.");
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
