const mongoose = require("mongoose");

const internalSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
    examDate: { type: String, required: true, index: true } // YYYY-MM-DD
  },
  { timestamps: true }
);

internalSchema.index({ userId: 1, subjectId: 1 }, { unique: true });

module.exports = mongoose.model("Internal", internalSchema);

