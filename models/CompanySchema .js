const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const JobSchema = new Schema({
  jobName: {
    type: String,
    required: true,
  },
  jobDescription: {
    type: String,
    required: false,
  },
  status: { type: String, default: "active" },
});
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
  jobs: [JobSchema],
});

module.exports = mongoose.model("CompanySc", CompanySchema);
