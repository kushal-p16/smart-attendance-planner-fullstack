const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    subjectName: { type: String, required: true, trim: true },
    subjectCode: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, index: true },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

subjectSchema.index({ userId: 1, subjectName: 1 });

module.exports = mongoose.model("Subject", subjectSchema);

