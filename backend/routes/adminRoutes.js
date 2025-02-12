const express = require("express");
const router = express.Router();
const {
    getAllCourses,
    assignCourseToTeacher,
    getTeachersWithCourses,
    getAllTeachers, // ✅ Ensure this exists in adminController.js
    signupAdmin,
    loginAdmin
} = require("../controllers/adminController");

const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// ✅ Fetch all Moodle courses (Admin only)
router.get("/courses", authMiddleware, roleMiddleware("admin"), getAllCourses);

// ✅ Fetch all teachers (For Admin Dropdown)
router.get("/teachers", authMiddleware, roleMiddleware("admin"), getAllTeachers);

// ✅ Get all teachers with their assigned courses
router.get("/teachers-with-courses", authMiddleware, roleMiddleware("admin"), getTeachersWithCourses);

// ✅ Assign course to teacher
router.post("/assign-course", authMiddleware, roleMiddleware("admin"), assignCourseToTeacher);

// ✅ Admin Signup Route
router.post("/signup", signupAdmin);

// ✅ Admin Login Route
router.post("/login", loginAdmin);

module.exports = router;
