const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
require("dotenv").config();

const { connectDB } = require("./config/db");

const authRoutes = require("./routes/auth");
const subjectRoutes = require("./routes/subjects");
const timetableRoutes = require("./routes/timetable");
const attendanceRoutes = require("./routes/attendance");
const internalRoutes = require("./routes/internals");

async function main() {
  await connectDB(process.env.MONGODB_URI);

  const app = express();

  app.use(helmet());
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(morgan("dev"));

  app.get("/api/health", (req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/subjects", subjectRoutes);
  app.use("/api/timetable", timetableRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/internals", internalRoutes);

  // Serve frontend (static) from /frontend
  const frontendPath = path.join(__dirname, "../../frontend");
  app.use(express.static(frontendPath));

  app.get("*", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });

  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`Server running on port ${port}`));
}

main().catch((e) => {
  console.error("Failed to start server:", e);
  process.exit(1);
});

