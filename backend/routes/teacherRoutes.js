const express = require("express");
const router = express.Router();
const {
  signupTeacher,
  loginTeacher,
  getSubmittedEntries,
  gradeEntry,
  getTeacherCourses,
} = require("../controllers/teacherController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ✅ Teacher Signup
router.post("/signup", signupTeacher);

// ✅ Teacher Login
router.post("/login", loginTeacher);

// ✅ Fetch Assigned Courses for a Teacher (by Email)
router.get("/:teacherEmail/courses", authMiddleware, roleMiddleware("teacher"), getTeacherCourses);

// ✅ Get Submitted Entries
router.get("/:courseId", authMiddleware, roleMiddleware("teacher"), getSubmittedEntries);

// ✅ Grade an Entry
router.post("/grade", authMiddleware, roleMiddleware("teacher"), gradeEntry);

module.exports = router;
