const { CronJob } = require("cron");
const User = require("../../models/User");

const startDbDeleteJob = () => {
  const job = new CronJob("0 0 * * *", async () => {
    try {
      const date24HoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const result = await User.deleteMany({
        isVerify: false,
        creatAt: { $lt: date24HoursAgo },
      });

      if (result.deletedCount > 0) {
        console.log("Görev başarılı. Doğrulanmamış kullanıcılar silindi.");
      } else {
        console.log("Şuan doğrulanmamış kullanıcı yok.");
      }
    } catch (error) {
      console.error("Bir hata oluştu:", error);
    }
  });
  job.start();
};

const startAllJobs = () => {
  startDbDeleteJob();
};

const stopAllJobs = () => {
  startDbDeleteJob();
};

module.exports = {
  startAllJobs,
  stopAllJobs,
};

// Altta ki kodda 30 saniyede bir
// '*/30 * * * * *'

// Her 24 satte saat 00:00 da
// '0 0 * * *'
