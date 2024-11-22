const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const OldLeaveSchema = new Schema({
  originalLeaveId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true, // Orijinal izin kaydının ID'si (Leave koleksiyonundan)
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
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
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
    required: function () {
      return this.status === "Reddedildi";
    },
    default: "",
  },
  archivedAt: {
    type: Date,
    default: Date.now, // Arşivleme tarihi
  },
  createdAt: {
    type: Date,
    required: true,
  },
});

module.exports = mongoose.model("OldLeaveSchema", OldLeaveSchema);
