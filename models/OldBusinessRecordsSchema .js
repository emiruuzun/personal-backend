const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OldBusinessRecordsSchema = new Schema({
  originalRecordId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "DailyWorkRecord", // Orijinal iş kaydına referans
  },
  personnel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Kullanıcı şemasına referans
    required: true,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanySc", // Firma şemasına referans
    required: false,
  },
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanySc.jobs", // İş şemasına referans (CompanySc altında işler)
    required: false,
  },
  date: {
    type: Date,
    required: true,
  },
  isAssigned: {
    type: Boolean,
    default: false, // Varsayılan olarak false
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
  archivedAt: {
    type: Date,
    required: true, // Kaydın arşivlendiği tarih
    default: Date.now, // Varsayılan olarak şu anki tarih
  },
});

module.exports = mongoose.model("OldBusinessRecords", OldBusinessRecordsSchema);
