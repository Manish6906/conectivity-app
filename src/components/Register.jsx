import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import api from "../api";

const DEFAULT_PIC = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailForOtp, setEmailForOtp] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gender: "",
    password: "",
  });
  const [otp, setOtp] = useState("");
  const [profile, setProfile] = useState({ bio: "", education: "" });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(DEFAULT_PIC);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const submitStep1 = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.phone) return setError("Please enter a phone number");
    if (!form.gender) return setError("Please select a gender");

    try {
      setLoading(true);
      const { data } = await api.post("/auth/register", form);
      setEmailForOtp(data.email || form.email);
      setStep(2);
      setError(data.message || "OTP sent successfully");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtpStep = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) return setError("Please enter the OTP");

    try {
      setLoading(true);
      const { data } = await api.post("/auth/verify-otp", { email: emailForOtp, otp });
      localStorage.setItem("token", data.token);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/auth/resend-otp", { email: emailForOtp });
      setError(data.message || "A new OTP has been sent");
    } catch (err) {
      setError(err.response?.data?.message || "OTP resend failed");
    } finally {
      setLoading(false);
    }
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submitStep3 = async (e) => {
    e.preventDefault();
    setError("");
    const fd = new FormData();
    fd.append("bio", profile.bio);
    fd.append("education", profile.education);
    if (file) fd.append("profilePic", file);

    try {
      setLoading(true);
      await api.put("/auth/complete-profile", fd);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-box">
      <h2>Create Account</h2>
      <p>{step === 1 ? "Step 1 of 3" : step === 2 ? "Step 2 of 3" : "Step 3 of 3"}</p>
      {error && <p className="error">{error}</p>}

      {step === 1 && (
        <form onSubmit={submitStep1}>
          <input
            name="name"
            placeholder="Full name"
            autoComplete="name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <PhoneInput
            international
            defaultCountry="IN"
            placeholder="Phone number"
            value={form.phone}
            onChange={(phone) => setForm({ ...form, phone: phone || "" })}
          />

          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            required
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <input
            type="password"
            name="password"
            placeholder="Password (min 6)"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            minLength={6}
            required
          />

          <button disabled={loading}>{loading ? "Wait..." : "Send OTP"}</button>
          <p>
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={verifyOtpStep}>
          <p>OTP sent to {emailForOtp}.</p>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            required
          />
          <button disabled={loading}>{loading ? "Verifying..." : "Verify OTP"}</button>
          <button type="button" onClick={resendOtp} disabled={loading}>Resend OTP</button>
        </form>
      )}

      {step === 3 && (
        <form onSubmit={submitStep3}>
          <div style={{ textAlign: "center" }}>
            <img
              src={preview}
              alt="profile"
              width={110}
              height={110}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
            <br />
            <input type="file" accept="image/*" onChange={handleFile} />
          </div>

          <textarea
            placeholder="Bio"
            rows={3}
            value={profile.bio}
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
          />
          <input
            placeholder="Education"
            value={profile.education}
            onChange={(e) =>
              setProfile({ ...profile, education: e.target.value })
            }
          />

          <button disabled={loading}>{loading ? "Saving..." : "Finish"}</button>
          <button type="button" onClick={() => navigate("/")}>
            Skip
          </button>
        </form>
      )}
    </div>
  );
}

export default Register;