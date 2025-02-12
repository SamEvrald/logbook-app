import React, { useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";

const TeacherLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
  
    try {
      const response = await API.post("/teachers/login", { email, password });
  
      const { token, user } = response.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));  // ✅ Store user properly
  
      navigate("/teacher", { state: { user } });
    } catch (err) {
      setError("Invalid credentials or server error.");
    }
  };
  
  return (
    <div style={{ maxWidth: "400px", margin: "50px auto" }}>
      <h2>Teacher Login</h2>
      <form onSubmit={handleLogin}>
        {error && <p style={{ color: "red" }}>{error}</p>}
        <div>
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div>
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>

        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default TeacherLoginPage; // ✅ Ensure it's a default export
