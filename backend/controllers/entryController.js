const axios = require("axios");
const db = require("../models/db");

exports.createEntry = async (req, res) => {
  try {
    const { moodle_id, courseId, role_in_task, type_of_work, pathology, clinical_info, content, consentForm } = req.body;

    if (!moodle_id || !courseId) {
      return res.status(400).json({ message: "❌ Student Moodle ID and Course ID are required." });
    }

    console.log(`🛠️ Received Entry Request:`, req.body);

    // ✅ 1️⃣ Check if student exists
    const [userRows] = await db.promise().query("SELECT id FROM users WHERE moodle_id = ?", [moodle_id]);

    if (userRows.length === 0) {
      return res.status(404).json({ message: "❌ No user found with this Moodle ID." });
    }

    const studentId = userRows[0].id;

    // ✅ 2️⃣ Check if course exists locally
    const [courseRows] = await db.promise().query("SELECT id FROM courses WHERE id = ?", [courseId]);

    if (courseRows.length === 0) {
      console.log(`⚠️ Course ID ${courseId} not found locally. Fetching from Moodle...`);

      // 🔥 Fetch course from Moodle
      const moodleToken = process.env.MOODLE_TOKEN;
      const moodleBaseUrl = process.env.MOODLE_BASE_URL;

      if (!moodleToken) {
        console.error("❌ Moodle API token is missing.");
        return res.status(500).json({ message: "Moodle API token is missing." });
      }

      try {
        console.log(`🌍 Fetching course from Moodle: Course ID ${courseId}`);

        const response = await axios.get(`${moodleBaseUrl}/webservice/rest/server.php`, {
          params: {
            wstoken: moodleToken,
            wsfunction: "core_course_get_courses",
            moodlewsrestformat: "json",
          },
        });

        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          console.log("📥 Moodle API Course Response:", response.data);

          // ✅ Check if the course exists in the response
          const foundCourse = response.data.find(course => course.id == courseId);

          if (!foundCourse) {
            console.error(`❌ Course ID ${courseId} not found in Moodle.`);
            return res.status(400).json({ message: `Course ID ${courseId} does not exist in Moodle.` });
          }

          console.log(`✅ Course Found: ${foundCourse.fullname}`);

          // ✅ Insert course into local database
          await db.promise().query(
            `INSERT INTO courses (id, fullname, shortname) VALUES (?, ?, ?) 
             ON DUPLICATE KEY UPDATE fullname = VALUES(fullname), shortname = VALUES(shortname)`,
            [foundCourse.id, foundCourse.fullname, foundCourse.shortname]
          );

          console.log(`✅ Course ID ${foundCourse.id} inserted into database.`);
        } else {
          console.error("❌ No courses found in Moodle API response.");
          return res.status(400).json({ message: `Course ID ${courseId} does not exist in Moodle.` });
        }
      } catch (error) {
        console.error("❌ Moodle API Fetch Error:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to fetch course from Moodle.", error: error.message });
      }
    }

    // ✅ 4️⃣ Insert logbook entry
    console.log(`📝 Creating logbook entry for student ID ${studentId} and course ID ${courseId}`);

    await db.promise().query(
      `INSERT INTO logbook_entries 
       (student_id, course_id, role_in_task, type_of_work, pathology, clinical_info, content, consent_form, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [studentId, courseId, role_in_task, type_of_work, pathology, clinical_info, content, consentForm]
    );

    console.log("✅ Logbook entry created successfully.");
    res.status(201).json({ message: "✅ Logbook entry created successfully." });

  } catch (error) {
    console.error("❌ Database error:", error);
    res.status(500).json({ message: "Failed to create entry", error: error.message });
  }
};




// ✅ Fetch all logbook entries for a student
exports.getStudentEntries = async (req, res) => {
    const { moodle_id } = req.params;

    try {
        // ✅ Fetch student ID from `users` table using moodle_id
        const [userRows] = await db.promise().query("SELECT id FROM users WHERE moodle_id = ?", [moodle_id]);

        if (userRows.length === 0) {
            return res.status(404).json({ message: "User with this Moodle ID not found." });
        }

        const studentId = userRows[0].id;

        // ✅ Fetch logbook entries for student
        const [entries] = await db.promise().query(
            `SELECT id, course_id, type_of_work, role_in_task, pathology, consent_form, content, status, grade, feedback, entry_date
             FROM logbook_entries WHERE student_id = ? ORDER BY entry_date DESC`,
            [studentId]
        );

        res.status(200).json(entries);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Failed to fetch student logbook entries.", error: error.message });
    }
};

// ✅ Fetch all submitted logbook entries for a specific course (Teacher View)
exports.getSubmittedEntries = async (req, res) => {
    const { courseId } = req.params;

    try {
        const [entries] = await db.promise().query(
            `SELECT * FROM logbook_entries WHERE course_id = ? AND status = 'submitted'`,
            [courseId]
        );

        res.status(200).json(entries);
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Failed to fetch submitted entries.", error: error.message });
    }
};

// ✅ Grade an Entry (Teacher)
exports.gradeEntry = async (req, res) => {
    const { entryId, grade, feedback } = req.body;

    if (!entryId || grade === undefined || !feedback) {
        return res.status(400).json({ message: "All fields are required." });
    }

    try {
        await db.promise().query(
            `UPDATE logbook_entries 
             SET grade = ?, feedback = ?, status = 'graded' 
             WHERE id = ?`,
            [grade, feedback, entryId]
        );

        res.status(200).json({ message: "Entry graded successfully." });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Failed to grade entry.", error: error.message });
    }
};

// ✅ Update Entry Status (Student submits logbook entry)
exports.updateEntryStatus = async (req, res) => {
    const { entryId, status } = req.body;

    if (!entryId || !status) {
        return res.status(400).json({ message: "Entry ID and status are required." });
    }

    try {
        await db.promise().query(
            `UPDATE logbook_entries SET status = ? WHERE id = ?`,
            [status, entryId]
        );

        res.status(200).json({ message: "Entry status updated successfully." });
    } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ message: "Failed to update entry status.", error: error.message });
    }
};
