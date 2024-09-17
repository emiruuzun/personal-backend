const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DailyWorkRecordSchema = new Schema({
  personnel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // User şemasına referans
    required: true,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanySc", // Company şemasına referans
    required: false, // İş atanmayan personel için boş bırakılabilir
  },
  date: {
    type: Date,
    required: true,
  },
  isAssigned: {
    type: Boolean,
    default: false, // Varsayılan olarak false (işe atanmamış)
  },
  job_start_time: {
    type: String,
    required: function () {
      return this.isAssigned;
    }, // isAssigned true ise gerekli
  },
  job_end_time: {
    type: String,
    required: false, // İş bitiminde girilecek
  },
  overtime_hours: {
    start_time: {
      type: String,
      required: false, // Mesai başlangıç saati
    },
    end_time: {
      type: String,
      required: false, // Mesai bitiş saati
    },
  },
  notes: {
    type: String,
  },
});

// isAssigned alanını company_id'ye bağlı olarak otomatik ayarlama
DailyWorkRecordSchema.pre("save", function (next) {
  // Eğer company_id varsa ve boş değilse, isAssigned true olmalı
  if (this.company_id) {
    this.isAssigned = true;
  } else {
    this.isAssigned = false;
    // İş atanmayan personel için iş saatlerini temizleyebiliriz
    this.job_start_time = undefined;
    this.job_end_time = undefined;
    this.overtime_hours = {
      start_time: undefined,
      end_time: undefined,
    };
  }
  next();
});

module.exports = mongoose.model("DailyWorkRecord", DailyWorkRecordSchema);
