import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";

function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState("");
  const [otpExpiresAt, setOtpExpiresAt] = useState(null);
  const [otpTimer, setOtpTimer] = useState("05:00");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!otpExpiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(0, otpExpiresAt - Date.now());
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setOtpTimer(`${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`);

      if (remaining <= 0) {
        setOtp("");
        setOtpExpiresAt(null);
        setError("OTP expire ho gaya hai. Naya OTP mangao.");
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [otpExpiresAt]);

  const sendLoginOtp = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login/request-otp", form);
      setOtpExpiresAt(Date.now() + 5 * 60 * 1000);
      setOtp("");
      setStep(2);
      setError(data.message || "OTP aapke email par bheja gaya hai.");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const verifyLoginOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) return setError("OTP enter karo.");

    try {
      setLoading(true);
      const { data } = await api.post("/auth/login/verify-otp", { email: form.email, otp });
      localStorage.setItem("token", data.token);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "OTP verify karne me problem hui.");
    } finally {
      setLoading(false);
    }
  };

  const resendLoginOtp = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/auth/login/request-otp", form);
      setOtpExpiresAt(Date.now() + 5 * 60 * 1000);
      setOtp("");
      setError(data.message || "Naya OTP aapke email par bheja gaya hai.");
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
          <div className="otp-panel">
            <p>OTP {form.email} par bheja gaya hai.</p>
            <p style={{ marginTop: 8, color: otpExpiresAt ? "#dc2626" : "#6b7280" }}>
              Ye OTP 5 minute ke liye valid hai: <strong>{otpTimer}</strong>
            </p>
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit OTP enter karo"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <button disabled={loading || (!!otpExpiresAt && otpTimer === "00:00")}>{loading ? "Verify ho raha hai..." : "OTP verify karo"}</button>
          <button type="button" onClick={resendLoginOtp} disabled={loading}>Naya OTP bhejo</button>
        </form>
      )}

      <p className="pt-3">
        New user? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}

export default Login;