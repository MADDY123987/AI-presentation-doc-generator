// src/components/auth/AuthPage.jsx
import React, { useState } from "react";
import "./AuthPage.css";
import { AUTH_BASE_URL } from "../../config"; 

function AuthPage({ onBackHome, onLogin }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch(`${AUTH_BASE_URL}/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            password,
            is_active: true,
            is_superuser: false,
            is_verified: false,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Registration failed");

        alert("Registration successful! Please login now.");
        setMode("login");
      } 
      else {
        // 🔐 LOGIN EXACTLY LIKE SWAGGER WORKING CURL
        const form = new URLSearchParams();
        form.append("grant_type", "password");
        form.append("username", email.trim());
        form.append("password", password);
        form.append("scope", "");
        form.append("client_id", "string");
        form.append("client_secret", "string");

        const res = await fetch(`${AUTH_BASE_URL}/auth/jwt/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: form.toString(),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Login failed");

        const token = data.access_token;
        if (!token) throw new Error("Invalid token response");

        // store token + email
        localStorage.setItem("authToken", token);
        localStorage.setItem("authEmail", email.trim());

        // Load user profile
        const meRes = await fetch(`${AUTH_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const me = await meRes.json();
        if (!meRes.ok) throw new Error(me.detail || "User info load failed");

        localStorage.setItem("authUser", JSON.stringify(me));
        if (onLogin) onLogin(me);

        alert("Login successful!");
        if (onBackHome) onBackHome();
      }
    } catch (err) {
      alert(err.message);
      console.error("Auth error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-page-card">
        <div className="auth-page-header">
          <button className="auth-back" onClick={onBackHome}>← Back</button>

          <h1>{mode === "login" ? "Welcome back" : "Create your workspace"}</h1>
          <p>
            {mode === "login"
              ? "Sign in to access your AI tools."
              : "Sign up to save AI projects in one place."}
          </p>
        </div>

        <div className="auth-page-tabs">
          <button
            className={mode === "login" ? "auth-page-tab active" : "auth-page-tab"}
            onClick={() => setMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "register" ? "auth-page-tab active" : "auth-page-tab"}
            onClick={() => setMode("register")}
          >
            Register
          </button>
        </div>

        <form className="auth-page-form" onSubmit={handleSubmit}>
          {mode === "register" && (
            <label>
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          <button type="submit" className="auth-page-submit" disabled={loading}>
            {loading
              ? mode === "login"
                ? "Logging in..."
                : "Creating..."
              : mode === "login"
              ? "Login"
              : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthPage;
