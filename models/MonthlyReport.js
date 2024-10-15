const mongoose = require("mongoose");

const MonthlyReportSchema = new mongoose.Schema({
  month: {
    type: Number, // Ay numarası (1 = Ocak, 12 = Aralık)
    required: true,
  },
  year: {
    type: Number, // Yıl
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
      total_hours_worked: {
        type: Number, // O ay çalışılan toplam saat
      },
      overtime_hours: {
        type: Number, // O ayda yapılan toplam mesai saati
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

module.exports = mongoose.model("MonthlyReport", MonthlyReportSchema);
