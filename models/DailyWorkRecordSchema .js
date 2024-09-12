const mongoose = require("mongoose");

const DailyWorkRecordSchema = new mongoose.Schema({
  personnel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // User şemasına referans
    required: true,
  },
  company_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company", // Company şemasına referans
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  check_in_time: {
    type: String,
    required: true,
  },
  check_out_time: {
    type: String,
    required: true,
  },
  notes: {
    type: String,
  },
});

module.exports = mongoose.model("DailyWorkRecord", DailyWorkRecordSchema);
