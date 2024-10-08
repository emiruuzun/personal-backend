const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const activitySchema = Schema({
  type: {
    type: String,
    required: true, // "user_registration", "task_completion", "company_added", "system_update" gibi
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Activity", activitySchema);
