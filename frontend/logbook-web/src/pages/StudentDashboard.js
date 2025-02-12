import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api/api";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem("user")); // 🔥 Retrieve user from localStorage
  const storedCourses = JSON.parse(localStorage.getItem("courses")); // 🔥 Retrieve courses from localStorage
  const token = localStorage.getItem("token"); // ✅ Retrieve token

  const [user, setUser] = useState(storedUser);
  const [courses, setCourses] = useState(storedCourses || []);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !user.moodle_id) {
      console.error("User not found. Redirecting to login...");
      navigate("/login");
      return;
    }

    if (!token) {
      console.error("No token found. Redirecting to login...");
      navigate("/login");
      return;
    }

    // ✅ Fetch student logbook entries using moodle_id
    const fetchEntries = async () => {
      try {
        const response = await API.get(`/entries/student/${user.moodle_id}`, {
          headers: { Authorization: `Bearer ${token}` }, // ✅ Include token in headers
        });
        setEntries(response.data);
      } catch (error) {
        console.error("❌ Failed to fetch entries:", error.response?.data || error.message);
        if (error.response?.status === 401) {
          navigate("/login"); // 🔥 Redirect to login if unauthorized
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEntries();
  }, [user, token, navigate]);

  const handleCreateEntry = (course) => {
    if (!user || !course) {
      alert("User or course data is missing");
      return;
    }

    // ✅ Store user and course in localStorage
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("selectedCourse", JSON.stringify(course));

    navigate("/student/new-entry");
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Welcome, {user?.fullname || user?.username}!</h2>

      {/* ✅ Display Enrolled Courses */}
      <h3>Your Courses:</h3>
      {courses.length === 0 ? (
        <p>You are not enrolled in any courses.</p>
      ) : (
        <ul>
          {courses.map((course) => (
            <li key={course.id} style={{ marginBottom: "10px" }}>
              <strong>{course.fullname}</strong> (ID: {course.id})
              <button
                style={{ marginLeft: "10px" }}
                onClick={() => handleCreateEntry(course)}
              >
                Create Entry
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ✅ Display Logbook Entries */}
      <h3>Your Logbook Entries:</h3>
      {loading ? (
        <p>Loading entries...</p>
      ) : entries.length === 0 ? (
        <p>No entries found. Click "Create Entry" to submit a new logbook entry.</p>
      ) : (
        <table border="1" style={{ width: "100%", textAlign: "left", marginTop: "20px" }}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Course</th>
              <th>Type</th>
              <th>Role</th>
              <th>Pathology</th>
              <th>Consent</th>
              <th>Status</th>
              <th>Grade</th>
              <th>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.entry_date).toLocaleDateString()}</td>
                <td>{entry.course_id}</td>
                <td>{entry.type_of_work}</td>
                <td>{entry.role_in_task}</td>
                <td>{entry.pathology || "N/A"}</td>
                <td>{entry.consent_form === "yes" ? "Yes" : "No"}</td>
                <td style={{ fontWeight: "bold", color: entry.status === "graded" ? "green" : "orange" }}>
                  {entry.status === "graded" ? "Graded" : "Waiting for Grading"}
                </td>
                <td>{entry.grade !== null ? entry.grade : "-"}</td>
                <td>{entry.feedback || "No feedback yet"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default StudentDashboard;
