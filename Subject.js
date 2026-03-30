const jwt = require("jsonwebtoken");
const User = require("../models/User");

async function auth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.userId).select("_id username name");
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = { userId: user._id.toString(), username: user.username, name: user.name };
    next();
  } catch (e) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

module.exports = { auth };

