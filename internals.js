const mongoose = require("mongoose");

const timetableSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    day: { type: String, required: true, index: true }, // Monday..Friday
    period: { type: Number, required: true, index: true }, // 1..6
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", default: null },
    slotType: { type: String, required: true } // regular | lab | case | lab-follow | case-follow
  },
  { timestamps: true }
);

// Only one assignment per user/day/period.
timetableSchema.index({ userId: 1, day: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("TimetableAssignment", timetableSchema);

