import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api";
import PasswordInput from "./PasswordInput";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("rememberedLogin") || "{}");
      if (saved.email) setForm((prev) => ({ ...prev, email: saved.email }));
      if (saved.password) setForm((prev) => ({ ...prev, password: saved.password }));
    } catch {
      // Ignore invalid saved data.
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      const { data } = await api.post("/auth/login", form);
      localStorage.setItem("token", data.token);
      localStorage.setItem("rememberedLogin", JSON.stringify({ email: form.email, password: form.password }));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-box">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleLogin}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          autoComplete="username"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <PasswordInput
          name="password"
          placeholder="Password"
          autoComplete="current-password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
          className="px-3 py-2.5 pr-11 text-sm border border-[#dfe7f3] rounded-xl bg-[#f8fafc] text-slate-900 outline-none focus:border-[#2563eb] focus:shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
        />
        <button disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
      </form>

      <p className="pt-3">
        New user? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}

export default Login;