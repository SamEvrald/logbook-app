const db = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ✅ Teacher Signup
const signupTeacher = async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.promise().query(
        "INSERT INTO teachers (username, email, password) VALUES (?, ?, ?)",
        [username, email, hashedPassword]
    );

    res.status(201).json({ message: "Teacher signup successful. Please log in." });
};

// ✅ Teacher Login
const loginTeacher = async (req, res) => {
    const { email, password } = req.body;

    const [rows] = await db.promise().query("SELECT * FROM teachers WHERE email = ?", [email]);
    if (rows.length === 0) {
        return res.status(401).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = jwt.sign(
        { teacherId: rows[0].id, email: rows[0].email, role: "teacher" },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.status(200).json({
        message: "Login successful",
        user: { username: rows[0].username, email: rows[0].email, role: "teacher" },
        token,
    });
};

// ✅ Fetch Courses Assigned to a Teacher
const getTeacherCourses = async (req, res) => {
    const { teacherEmail } = req.params;
  
    try {
      // 🔍 Fetch teacher ID based on email
      const [teacher] = await db.promise().query(
        "SELECT id FROM teachers WHERE email = ?",
        [teacherEmail]
      );
  
      if (teacher.length === 0) {
        return res.status(404).json({ message: "Teacher not found" });
      }
  
      const teacherId = teacher[0].id;
  
      // 🔍 Fetch assigned courses for the teacher
      const [results] = await db.promise().query(
        `SELECT c.id, c.fullname 
         FROM teacher_courses tc
         JOIN courses c ON tc.course_id = c.id
         WHERE tc.teacher_id = ?`,
        [teacherId]
      );
  
      res.json(results);
    } catch (error) {
      console.error("Database error:", error);
      res.status(500).json({ message: "Failed to fetch teacher courses", error: error.message });
    }
  };
  
// ✅ Get All Submitted Entries for a Given Course
const getSubmittedEntries = async (req, res) => {
    const { courseId } = req.params;

    try {
        const [entries] = await db.promise().query(
            "SELECT * FROM logbook_entries WHERE course_id = ? AND status = ?",
            [courseId, "submitted"]
        );

        res.status(200).json(entries);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Failed to fetch submitted entries", error: error.message });
    }
};

// ✅ Grade an Entry
const gradeEntry = async (req, res) => {
    const { entryId, grade, feedback } = req.body;

    try {
        await db.promise().query(
            `UPDATE logbook_entries 
             SET grade = ?, feedback = ?, status = 'graded' 
             WHERE id = ?`,
            [grade, feedback, entryId]
        );

        res.status(200).json({ message: "Entry graded successfully" });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Failed to grade entry", error: error.message });
    }
};

// ✅ Correctly Export All Functions
module.exports = {
    signupTeacher,
    loginTeacher,
    getSubmittedEntries,
    gradeEntry,
    getTeacherCourses, // ✅ Ensure this is included
  };