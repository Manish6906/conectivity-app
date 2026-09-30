import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const sendLoginOtp = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login/request-otp", form);
      setStep(2);
      setError(data.message || "OTP sent to your email");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) return setError("Please enter the OTP");

    try {
      setLoading(true);
      const { data } = await api.post("/auth/login/verify-otp", { email: form.email, otp });
      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendLoginOtp = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login/request-otp", form);
      setError(data.message || "A new OTP has been sent");
    } catch (err) {
      setError(err.response?.data?.message || "OTP resend failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-box">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}

      {step === 1 && (
        <form onSubmit={sendLoginOtp}>
          <input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <button disabled={loading}>{loading ? "Wait..." : "Send OTP"}</button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyLoginOtp}>
          <p>OTP sent to {form.email}.</p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <button disabled={loading}>{loading ? "Verifying..." : "Verify OTP"}</button>
          <button type="button" onClick={resendLoginOtp} disabled={loading}>Resend OTP</button>
        </form>
      )}

      <p>
        New user? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}

export default Login;