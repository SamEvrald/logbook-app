const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.header("Authorization");

  if (!authHeader) {
    return res.status(401).json({ message: "Access Denied. No token provided." });
  }

  const token = authHeader.split(" ")[1]; // Extract token

  if (!token) {
    return res.status(401).json({ message: "Access Denied. Invalid token format." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    if (!decoded.moodle_id) {
      return res.status(401).json({ message: "Invalid token: Moodle ID missing." });
    }

    next();
  } catch (err) {
    console.error("JWT Verification Error:", err.message);
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};
