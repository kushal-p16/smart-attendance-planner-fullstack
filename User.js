const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    date: { type: String, required: true, index: true }, // YYYY-MM-DD
    period: { type: Number, required: true, index: true }, // session period; merged lab counts as the start period
    status: { type: String, required: true, enum: ["present", "absent"] }
  },
  { timestamps: true }
);

attendanceSchema.index({ userId: 1, subjectId: 1, date: 1, period: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);

