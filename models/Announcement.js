const  mongoose = require("mongoose");
const Schema =  mongoose.Schema;

const AnnouncementSchema  = new Schema({
    title: {
        type: String,
        required: [true, 'Please provide a title for the announcement.'],
        trim: true,
      },
      content: {
        type: String,
        required: [true, 'Please provide content for the announcement.'],
      },
      date: {
        type: Date,
        default: Date.now,
      },
      createdBy: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
});


module.exports = mongoose.model("Announcemen", AnnouncementSchema);
