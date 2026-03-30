const express = require("express");
const Attendance = require("../models/Attendance");
const Subject = require("../models/Subject");
const TimetableAssignment = require("../models/TimetableAssignment");
const { auth } = require("../middleware/auth");
const { dateToDayName, buildSessionsFromAssignments, DAYS } = require("../utils/schedule");

const router = express.Router();

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

router.get("/summary", auth, async (req, res) => {
  const subjects = await Subject.find({ userId: req.user.userId, isActive: true }).lean();

  const grouped = await Attendance.aggregate([
    { $match: { userId: req.user.userId } },
    {
      $group: {
        _id: "$subjectId",
        total: { $sum: 1 },
        attended: {
          $sum: {
            $cond: [{ $eq: ["$status", "present"] }, 1, 0]
          }
        }
      }
    }
  ]);

  const map = new Map(grouped.map(g => [String(g._id), g]));
  const summary = subjects.map(s => {
    const g = map.get(String(s._id)) || { total: 0, attended: 0 };
    const pct = g.total === 0 ? 100 : Math.round((g.attended / g.total) * 100);
    return {
      subjectId: String(s._id),
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
      total: g.total,
      attended: g.attended,
      absent: g.total - g.attended,
      pct
    };
  });

  res.json({ summary });
});

router.get("/day", auth, async (req, res) => {
  try {
    const { date } = req.query || {};
    if (!date) return res.status(400).json({ message: "date is required" });
    const normalized = String(date).slice(0, 10);

    if (normalized > todayISO()) return res.status(400).json({ message: "Cannot edit future dates" });

    const dayName = dateToDayName(normalized);
    if (!DAYS.includes(dayName)) return res.json({ sessions: [] });

    const assignments = await TimetableAssignment.find({ userId: req.user.userId, day: dayName, period: { $gte: 1, $lte: 6 } })
      .populate({ path: "subjectId", match: { isActive: true }, select: "subjectName subjectCode isActive" })
      .lean();

    const assignmentsByPeriod = {};
    for (const a of assignments) {
      if (!a.subjectId) continue; // filtered inactive subjects
      assignmentsByPeriod[a.period] = { subjectId: a.subjectId._id, slotType: a.slotType };
    }

    const subjectsById = {}; // optional map not needed because builder accepts direct subject lookup below
    // We'll pass a subjects map for the builder.
    // But builder expects subjectsById keyed by string.
    const uniqueSubjectIds = Object.keys(assignmentsByPeriod).map(p => String(assignmentsByPeriod[p].subjectId));
    // Fetch subject details once:
    const subjectDocs = await Subject.find({ userId: req.user.userId, isActive: true, _id: { $in: uniqueSubjectIds } })
      .select("_id subjectName subjectCode")
      .lean();
    for (const sd of subjectDocs) subjectsById[String(sd._id)] = sd;

    const sessions = buildSessionsFromAssignments(assignmentsByPeriod, subjectsById);

    // attach attendance status
    const attDocs = await Attendance.find({
      userId: req.user.userId,
      date: normalized
    }).lean();
    const attMap = new Map(attDocs.map(a => [`${a.subjectId}_${a.period}`, a.status]));

    const sessionsWithStatus = sessions.map(s => ({
      ...s,
      status: attMap.get(`${s.subjectId}_${s.sessionPeriod}`) || null,
      date: normalized,
      day: dayName
    }));

    res.json({ sessions: sessionsWithStatus });
  } catch (e) {
    res.status(500).json({ message: "Failed to load attendance day" });
  }
});

router.get("/history", auth, async (req, res) => {
  const { subjectId, from, to } = req.query || {};
  const q = { userId: req.user.userId };
  if (subjectId) q.subjectId = subjectId;
  if (from || to) {
    q.date = {};
    if (from) q.date.$gte = String(from).slice(0, 10);
    if (to) q.date.$lte = String(to).slice(0, 10);
  }

  const records = await Attendance.find(q)
    .populate({ path: "subjectId", select: "subjectName subjectCode" })
    .sort({ date: -1, period: 1 })
    .lean();

  res.json({ records });
});

router.put("/", auth, async (req, res) => {
  try {
    const { subjectId, date, period, status } = req.body || {};
    if (!subjectId || !date || !period || !status) return res.status(400).json({ message: "subjectId, date, period, status are required" });

    const normalized = String(date).slice(0, 10);
    if (normalized > todayISO()) return res.status(400).json({ message: "Cannot edit future dates" });

    const p = Number(period);
    if (!Number.isInteger(p) || p < 1 || p > 6) return res.status(400).json({ message: "Invalid period" });
    if (!["present", "absent"].includes(status)) return res.status(400).json({ message: "Invalid status" });

    const dayName = dateToDayName(normalized);
    const slot = await TimetableAssignment.findOne({ userId: req.user.userId, day: dayName, period: p }).lean();
    if (!slot || !slot.subjectId) return res.status(400).json({ message: "No scheduled class for that period" });
    if (slot.subjectId.toString() !== String(subjectId)) return res.status(400).json({ message: "Subject mismatch for this period" });
    if (slot.slotType === "lab-follow" || slot.slotType === "case-follow") {
      return res.status(400).json({ message: "Merged labs are counted only once on the start period" });
    }

    const updated = await Attendance.findOneAndUpdate(
      { userId: req.user.userId, subjectId, date: normalized, period: p },
      { userId: req.user.userId, subjectId, date: normalized, period: p, status },
      { upsert: true, new: true }
    );

    res.json({ attendance: updated });
  } catch (e) {
    res.status(500).json({ message: "Failed to save attendance" });
  }
});

module.exports = router;

