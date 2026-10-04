import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [keepSigned, setKeepSigned] = useState(true);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage("");
    try {
      await login(form.email, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleForgot = (e) => {
    e.preventDefault();
    setError("");
    setInfoMessage(
      "Password reset instructions have been sent to your email address.",
    );
  };

  return (
    <div className="auth-page">
      <div className="auth-header">
        <div className="app-brand-logo">SyncMeet</div>
      </div>

      <div className="auth-card">
        <div className="auth-title-group">
          <h1>Sign in</h1>
          <p>Welcome back. Enter your details to continue.</p>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {infoMessage && (
          <div
            className="error-banner"
            style={{
              background: "rgba(34, 197, 94, 0.15)",
              borderColor: "#22c55e",
              color: "#4ade80",
            }}
          >
            {infoMessage}
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          <input
            type="email"
            placeholder="name@company.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          <div className="password-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            <button
              type="button"
              className="password-toggle-btn"
              onClick={() => setShowPassword(!showPassword)}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>

          <div className="auth-row-options">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={keepSigned}
                onChange={(e) => setKeepSigned(e.target.checked)}
              />
              Keep me signed in
            </label>
            <a href="#forgot" onClick={handleForgot}>
              Forgot password?
            </a>
          </div>

          <button type="submit">Sign in</button>
        </form>
      </div>

      <div className="auth-footer">
        New to SyncMeet? <Link to="/register">Sign up free</Link>
      </div>
    </div>
  );
}
