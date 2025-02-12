import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../api/api";

const TeacherDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = location.state || { user: null };

  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      console.error("User not found. Please log in again.");
      return;
    }

    // ✅ Fetch courses the teacher is assigned
    const fetchCourses = async () => {
        if (!user) {
          console.error("User not found. Please log in again.");
          return;
        }
      
        try {
          // ✅ Get token from localStorage
          const token = localStorage.getItem("token");
      
          // ✅ Make API call with token
          const response = await API.get(`/teachers/${user.email}/courses`, {
            headers: { Authorization: `Bearer ${token}` }
          });
      
          setCourses(response.data);
        } catch (error) {
          console.error("Failed to fetch courses:", error);
        }
      };
      
      

    fetchCourses();
  }, [user]);

  const fetchEntries = async (courseId) => {
    setLoading(true);
    setSelectedCourse(courseId);
    try {
      const response = await API.get(`/teachers/${courseId}`);
      setEntries(response.data);
    } catch (error) {
      console.error("Failed to fetch entries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeEntry = (entryId) => {
    navigate(`/teacher/grade/${entryId}`, { state: { user } });
  };

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <h2>Welcome, {user?.username}!</h2>

      {/* ✅ Display Courses */}
      <h3>Your Courses:</h3>
      {courses.length === 0 ? (
        <p>You are not assigned to any courses.</p>
      ) : (
        <ul>
          {courses.map((course) => (
            <li key={course.id} style={{ marginBottom: "10px" }}>
              <strong>{course.fullname}</strong>
              <button
                style={{ marginLeft: "10px" }}
                onClick={() => fetchEntries(course.id)}
              >
                View Entries
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ✅ Display Submitted Entries */}
      {selectedCourse && (
        <>
          <h3>Submitted Entries for Course {selectedCourse}</h3>
          {loading ? (
            <p>Loading entries...</p>
          ) : entries.length === 0 ? (
            <p>No submitted entries for this course.</p>
          ) : (
            <table border="1" style={{ width: "100%", textAlign: "left", marginTop: "20px" }}>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Type</th>
                  <th>Role</th>
                  <th>Pathology</th>
                  <th>Consent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.student_id}</td>
                    <td>{entry.type_of_work}</td>
                    <td>{entry.role_in_task}</td>
                    <td>{entry.pathology || "N/A"}</td>
                    <td>{entry.consent_form === "yes" ? "Yes" : "No"}</td>
                    <td style={{ fontWeight: "bold", color: entry.status === "graded" ? "green" : "orange" }}>
                      {entry.status === "graded" ? "Graded" : "Waiting for Grading"}
                    </td>
                    <td>
                      <button onClick={() => handleGradeEntry(entry.id)}>
                        Grade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default TeacherDashboard;
