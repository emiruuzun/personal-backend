const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const LeaveSchema = new Schema({
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
  roadLeaveDays: {
    type: Number,
    required: true,
    default: 0,
  },
  address: {
    type: String,
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
    enum: ["Onaylandı", "Reddedildi", "Beklemede"], // Durum için enum kontrolü
    default: "Beklemede",
  },
  rejectionReason: {
    type: String,
    required: function () {
      return this.status === "Reddedildi"; // Eğer status 'Reddedildi' ise bu alan zorunludur.
    },
    default: "",
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

module.exports = mongoose.model("Leave", LeaveSchema);
