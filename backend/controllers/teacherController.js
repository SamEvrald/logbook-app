const db = require("../models/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// ✅ Teacher Signup
const signupTeacher = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required." });
        }

        // 🔍 Check if teacher already exists
        const [existingTeacher] = await db.promise().query(
            "SELECT id FROM teachers WHERE email = ?",
            [email]
        );

        if (existingTeacher.length > 0) {
            return res.status(400).json({ message: "Email already in use. Please log in." });
        }

        // ✅ Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // ✅ Insert into DB
        await db.promise().query(
            "INSERT INTO teachers (username, email, password) VALUES (?, ?, ?)",
            [username, email, hashedPassword]
        );

        res.status(201).json({ message: "Teacher signup successful. Please log in." });
    } catch (error) {
        console.error("❌ Signup Error:", error);
        res.status(500).json({ message: "Server error during signup.", error: error.message });
    }
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
  
    // ✅ Generate JWT Token
    const token = jwt.sign(
      { teacherId: rows[0].id, email: rows[0].email, role: "teacher" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
  
    // ✅ Send the user object and token
    res.status(200).json({
      message: "Login successful",
      user: { id: rows[0].id, username: rows[0].username, email: rows[0].email, role: "teacher" },
      token,
    });
  };

// ✅ Fetch Courses Assigned to a Teacher
const getTeacherCourses = async (req, res) => {
    try {
        const { teacherEmail } = req.params;

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
        const [courses] = await db.promise().query(
            `SELECT c.id, c.fullname 
             FROM teacher_courses tc
             JOIN courses c ON tc.course_id = c.id
             WHERE tc.teacher_id = ?`,
            [teacherId]
        );

        res.json({ courses });
    } catch (error) {
        console.error("❌ Fetch Courses Error:", error);
        res.status(500).json({ message: "Failed to fetch teacher courses", error: error.message });
    }
};

// ✅ Fetch Submitted Entries for Assigned Courses
const getSubmittedEntries = async (req, res) => {
    try {
        const { teacherEmail } = req.params;

        // 🔍 Get teacher ID
        const [teacher] = await db.promise().query(
            "SELECT id FROM teachers WHERE email = ?",
            [teacherEmail]
        );

        if (teacher.length === 0) {
            return res.status(404).json({ message: "Teacher not found" });
        }

        const teacherId = teacher[0].id;

        // 🔍 Get courses assigned to this teacher
        const [assignedCourses] = await db.promise().query(
            "SELECT course_id FROM teacher_courses WHERE teacher_id = ?",
            [teacherId]
        );

        if (assignedCourses.length === 0) {
            return res.json({ message: "No courses assigned to this teacher.", entries: [] });
        }

        const courseIds = assignedCourses.map(course => course.course_id);

        // 🔍 Get submitted AND graded logbook entries
        const [entries] = await db.promise().query(
            `SELECT le.id, le.case_number, le.student_id, le.type_of_work, le.pathology, 
                    le.content AS task_description, le.consent_form, le.work_completed_date, 
                    le.media_link, le.grade, le.feedback, le.status,
                    u.username AS student_name, c.fullname AS course_name
             FROM logbook_entries le
             JOIN users u ON le.student_id = u.id 
             JOIN courses c ON le.course_id = c.id
             WHERE le.course_id IN (?) AND le.status IN ('submitted', 'graded') -- 🔥 FIXED: Now includes graded entries
             ORDER BY le.status DESC, le.work_completed_date DESC`,
            [courseIds]
        );

        res.status(200).json({ entries });
    } catch (error) {
        console.error("❌ Fetch Entries Error:", error);
        res.status(500).json({ message: "Failed to fetch submitted entries.", error: error.message });
    }
};



// ✅ Grade an Entry
const gradeEntry = async (req, res) => {
    try {
        const { entryId, grade, feedback } = req.body;

        // 🔍 Ensure entry exists
        const [entryExists] = await db.promise().query("SELECT id FROM logbook_entries WHERE id = ?", [entryId]);
        if (entryExists.length === 0) {
            return res.status(404).json({ message: "Entry not found." });
        }

        // ✅ Update entry with grade and feedback
        await db.promise().query(
            `UPDATE logbook_entries 
             SET grade = ?, feedback = ?, status = 'graded' 
             WHERE id = ?`,
            [grade, feedback, entryId]
        );

        res.status(200).json({ message: "Entry graded successfully." });
    } catch (error) {
        console.error("❌ Grading Error:", error);
        res.status(500).json({ message: "Failed to grade entry.", error: error.message });
    }
};


// ✅ Export All Functions
module.exports = {
    signupTeacher,
    loginTeacher,
    getTeacherCourses,
    getSubmittedEntries,
    gradeEntry,
};
