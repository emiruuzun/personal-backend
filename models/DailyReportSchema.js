const mongoose = require("mongoose");

const DailyReportSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  assigned_personnel: [
    {
      personnel_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // User şemasına referans
      },
      company_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CompanySc", // Company şemasına referans
      },
    },
  ],
  unassigned_personnel: [
    {
      personnel_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", // User şemasına referans
      },
    },
  ],
});

module.exports = mongoose.model("DailyReport", DailyReportSchema);
