const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const CompanySchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  location: {
    type: String,
    required: true,
  },
  contact: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model("CompanySc", CompanySchema);
