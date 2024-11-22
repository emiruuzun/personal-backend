const mongoose = require("mongoose");

const OldStaffSchema = new mongoose.Schema({
  originalUserId: {
    type: mongoose.Schema.Types.ObjectId, // Orijinal kullanıcı ID'si
    required: true, // Zorunlu
    ref: "User", // Referans verdiğiniz model
  },
  name: { type: String, required: true },
  email: { type: String, required: true },
  group: { type: String, required: true },
  position: { type: String, required: true },
  status: { type: String, required: true },
  archivedAt: { type: Date, required: true }, // Yedekleme tarihi
  tcNo: { type: String, required: true },
  contact: { type: String, required: true },
  role: { type: String, required: true },
  subgroup: { type: String, required: false }, // Eğer `subgroup` varsa
});

module.exports = mongoose.model("OldStaff", OldStaffSchema);
