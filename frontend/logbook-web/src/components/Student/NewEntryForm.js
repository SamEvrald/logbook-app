import React, { useState, useEffect } from "react";
import API from "../../api/api";
import { useNavigate } from "react-router-dom";

const NewEntryForm = () => {
  const navigate = useNavigate();

  // ✅ Retrieve stored user, course, and token
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const storedCourse = JSON.parse(localStorage.getItem("selectedCourse"));
  const storedToken = localStorage.getItem("token");

  const [user, setUser] = useState(storedUser);
  const [course, setCourse] = useState(storedCourse);
  const [token, setToken] = useState(storedToken);
  const [typeOfWork, setTypeOfWork] = useState("");
  const [roleInTask, setRoleInTask] = useState("leader");
  const [clinicalInfo, setClinicalInfo] = useState("");
  const [pathology, setPathology] = useState("");
  const [consentForm, setConsentForm] = useState("no");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || !user.moodle_id) {
      console.error("❌ User not found. Redirecting to login...");
      navigate("/login");
      return;
    }

    if (!course || !course.id) {
      console.error("❌ Course not found. Redirecting to dashboard...");
      navigate("/student");
      return;
    }

    if (!token) {
      console.error("❌ Missing token. Redirecting to login...");
      navigate("/login");
      return;
    }
  }, [user, course, token, navigate]);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleConsentChange = (e) => {
    setConsentForm(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!user || !user.moodle_id) {
      setError("❌ Error: Student ID (Moodle ID) is missing.");
      return;
    }

    if (!course || !course.id) {
      setError("❌ Error: Course ID is missing.");
      return;
    }

    const studentMoodleId = user.moodle_id;
    const courseId = course.id;

    console.log("🚀 Preparing entry submission:");
    console.log("🆔 moodle_id:", studentMoodleId);
    console.log("📚 courseId:", courseId);
    console.log("📝 Other Fields:", {
      role_in_task: roleInTask,
      type_of_work: typeOfWork,
      clinical_info: clinicalInfo,
      pathology,
      consentForm,
      content,
    });

    try {
      const formData = new FormData();
      formData.append("moodle_id", studentMoodleId);
      formData.append("courseId", courseId);
      formData.append("role_in_task", roleInTask);
      formData.append("type_of_work", typeOfWork);
      formData.append("pathology", pathology);
      formData.append("clinical_info", clinicalInfo);
      formData.append("content", content);
      formData.append("consentForm", consentForm);

      files.forEach((file) => {
        formData.append("files", file);
      });

      console.log("🔐 Sending request with token:", token);

      const response = await API.post("/entries", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}`,
        },
      });

      console.log("✅ Entry submitted successfully:", response.data);
      alert("✅ Entry created successfully!");
      navigate("/student");
    } catch (err) {
      console.error("❌ Error submitting entry:", err.response?.data || err.message);
      setError(err.response?.data?.message || "Failed to create entry. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "500px", margin: "50px auto", padding: "20px", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h2>Create Entry for {course?.fullname || "Unknown Course"}</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>Type of Work (e.g., LLO, LLP)</label>
          <input type="text" value={typeOfWork} onChange={(e) => setTypeOfWork(e.target.value)} required />
        </div>

        <div>
          <label>Role in Task:</label>
          <select value={roleInTask} onChange={(e) => setRoleInTask(e.target.value)}>
            <option value="leader">Leader</option>
            <option value="observer">Observer</option>
            <option value="collaborator">Collaborator</option>
          </select>
        </div>

        <div>
          <label>Pathology / Purpose of the Task</label>
          <input type="text" value={pathology} onChange={(e) => setPathology(e.target.value)} required />
        </div>

        <div>
          <label>Clinical Info</label>
          <textarea value={clinicalInfo} onChange={(e) => setClinicalInfo(e.target.value)} />
        </div>

        <div>
          <label>Content (Description)</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} required />
        </div>

        {/* ✅ Consent Form (Radio Buttons) */}
        <div>
          <label>Consent Form:</label>
          <div>
            <label>
              <input type="radio" name="consent" value="yes" checked={consentForm === "yes"} onChange={handleConsentChange} />
              Yes
            </label>
            <label>
              <input type="radio" name="consent" value="no" checked={consentForm === "no"} onChange={handleConsentChange} />
              No
            </label>
          </div>
        </div>

        <div>
          <label>Files (Images, Videos, etc.)</label>
          <input type="file" multiple onChange={handleFileChange} />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit Entry"}
        </button>
      </form>
    </div>
  );
};

export default NewEntryForm;
