const axios = require("axios");
const db = require("../models/db");

// Function to generate a case number based on the course
const generateCaseNumber = async (courseId, courseName) => {
  const [caseResult] = await db.promise().query(
    "SELECT COUNT(*) AS count FROM logbook_entries WHERE course_id = ?",
    [courseId]
  );

  const entryNumber = caseResult[0].count + 1;
  return `${courseName.toUpperCase().replace(/\s+/g, "-")}-${entryNumber}`;
};

exports.createEntry = async (req, res) => {
  try {
    const { moodle_id, courseId, role_in_task, type_of_work, pathology, clinical_info, content, consentForm, work_completed_date, media_link } = req.body;

    if (!moodle_id || !courseId || !work_completed_date) {
      return res.status(400).json({ message: "❌ Student Moodle ID, Course ID, and Work Completed Date are required." });
    }

    console.log("🛠️ Received Entry Request:", req.body);

    // ✅ Check if student exists
    const [userRows] = await db.promise().query("SELECT id FROM users WHERE moodle_id = ?", [moodle_id]);

    if (userRows.length === 0) {
      return res.status(404).json({ message: "❌ No user found with this Moodle ID." });
    }

    const studentId = userRows[0].id;

    // ✅ Ensure course exists, otherwise fetch from Moodle
    let [courseRows] = await db.promise().query("SELECT fullname FROM courses WHERE id = ?", [courseId]);

    if (courseRows.length === 0) {
      console.log(`⚠️ Course ID ${courseId} not found locally. Fetching from Moodle...`);

      try {
        const moodleResponse = await axios.get(`${process.env.MOODLE_BASE_URL}/webservice/rest/server.php`, {
          params: {
            wstoken: process.env.MOODLE_TOKEN,
            wsfunction: "core_course_get_courses",
            moodlewsrestformat: "json",
          },
        });

        if (moodleResponse.data && Array.isArray(moodleResponse.data) && moodleResponse.data.length > 0) {
          console.log("📥 Moodle API Course Response:", moodleResponse.data);

          const foundCourse = moodleResponse.data.find(course => course.id == courseId);

          if (!foundCourse) {
            console.error(`❌ Course ID ${courseId} not found in Moodle.`);
            return res.status(400).json({ message: `Course ID ${courseId} does not exist in Moodle.` });
          }

          console.log(`✅ Course Found: ${foundCourse.fullname}`);

          // ✅ Insert course into local database
          await db.promise().query(
            `INSERT INTO courses (id, fullname, shortname) VALUES (?, ?, ?)`,
            [foundCourse.id, foundCourse.fullname, foundCourse.shortname]
          );

          courseRows = [{ fullname: foundCourse.fullname }];
        } else {
          return res.status(400).json({ message: `❌ Course ID ${courseId} does not exist in Moodle.` });
        }
      } catch (error) {
        console.error("❌ Moodle API Fetch Error:", error.response?.data || error.message);
        return res.status(500).json({ message: "Failed to fetch course from Moodle.", error: error.message });
      }
    }

    const courseName = courseRows[0].fullname;

    // ✅ Generate Case Number using Course Name & Entry Count
    const caseNumber = await generateCaseNumber(courseId, courseName);

    // ✅ Insert logbook entry
    console.log(`📝 Creating logbook entry for student ID ${studentId} and course ID ${courseId}`);

    await db.promise().query(
      `INSERT INTO logbook_entries 
       (case_number, student_id, course_id, role_in_task, type_of_work, pathology, clinical_info, content, consent_form, work_completed_date, media_link, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')`,
      [caseNumber, studentId, courseId, role_in_task, type_of_work, pathology, clinical_info, content, consentForm, work_completed_date, media_link]
    );

    res.status(201).json({ message: "✅ Logbook entry created successfully.", case_number: caseNumber });

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

        // ✅ Fetch required logbook entry fields
        const [entries] = await db.promise().query(
            `SELECT case_number, 
                    DATE_FORMAT(work_completed_date, '%d/%m/%y') AS work_completed_date,
                    type_of_work, 
                    pathology,
                    content AS task_description, 
                    media_link, 
                    consent_form, 
                    clinical_info,
                    grade, 
                    feedback,
                    status
             FROM logbook_entries 
             WHERE student_id = ? 
             ORDER BY work_completed_date DESC`,
            [studentId]
        );

        res.status(200).json(entries);
    } catch (error) {
        console.error("❌ Database error:", error);
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
