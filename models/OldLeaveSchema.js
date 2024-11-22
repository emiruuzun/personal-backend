const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OldLeaveSchema = new Schema({
  personnel_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "OldStaff", // Eski kullanıcı şemasına referans
    required: true,
  },
  fullName: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    required: true,
  },
  periodYear: {
    type: Number,
    required: true,
  },
  tcNo: {
    type: String,
    required: true,
    maxlength: 11,
  },
  leaveType: {
    type: String,
    required: true,
    enum: ["Yıllık İzin", "Hastalık İzni", "Mazeret İzni"],
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  leaveDays: {
    type: Number,
    required: true,
  },
  contactNumber: {
    type: String,
    required: true,
    maxlength: 11,
  },
  reason: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: [
      "Onaylandı",
      "Reddedildi",
      "Beklemede",
      "Onaylanmış (Yaklaşan)",
      "Geçmiş İzin",
    ],
    default: "Beklemede",
  },
  rejectionReason: {
    type: String,
    default: "",
  },
  archivedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model("OldLeave", OldLeaveSchema);
