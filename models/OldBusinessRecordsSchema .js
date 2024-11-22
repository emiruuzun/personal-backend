const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OldBusinessRecordsSchema = new Schema({
  personnel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OldStaff", // Eski kullanıcı şemasına referans
    required: true,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanySc", // Şirket referansı
    required: false,
  },
  job_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "CompanySc.jobs", // İş referansı
    required: false,
  },
  date: {
    type: Date,
    required: true,
  },
  isAssigned: {
    type: Boolean,
    default: false,
  },
  job_start_time: {
    type: String,
    required: function () {
      return this.isAssigned;
    },
  },
  job_end_time: {
    type: String,
    required: false,
  },
  overtime_hours: {
    start_time: {
      type: String,
      required: false,
    },
    end_time: {
      type: String,
      required: false,
    },
  },
  notes: {
    type: String,
  },
  archivedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("OldBusinessRecords", OldBusinessRecordsSchema);
