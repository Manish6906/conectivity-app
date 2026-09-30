import { useEffect, useState } from "react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import api from "../api";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import Btn from "../components/Btn";

const inp =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00a884] bg-white";

const Toggle = ({ on, onChange }) => (
  <button onClick={() => onChange(!on)}
    className={`w-11 h-6 rounded-full transition relative cursor-pointer shrink-0 ${on ? "bg-[#00a884]" : "bg-gray-300"}`}>
    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
  </button>
);

const Card = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
    <h2 className="font-semibold text-gray-800 mb-4">{title}</h2>
    {children}
  </div>
);

export default function Profile() {
  const { user, setUser } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user.name, phone: user.phone, gender: user.gender,
    bio: user.bio || "", education: user.education || "",
  });
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(user.profilePic);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pw, setPw] = useState({ oldPassword: "", newPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [accountStatus, setAccountStatus] = useState(user.isDeactivated ? "deactivated" : "active");

  const loadBlocked = () => api.get("/users/blocked").then((r) => setBlocked(r.data.users));
  const loadFriends = () => api.get("/friends").then((r) => setFriends(r.data.friends));
  useEffect(() => { loadBlocked(); loadFriends(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setMsg("");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append("profilePic", file);
    try {
      setSaving(true);
      const { data } = await api.put("/auth/me", fd);
      setUser(data.user);
      setMsg("✅ Profile updated successfully");
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.message || "Error"));
    } finally {
      setSaving(false);
    }
  };

  const setting = async (patch) => {
    const { data } = await api.put("/users/settings", patch);
    setUser(data.user);
  };

  const changePw = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.put("/auth/password", pw);
      setPwMsg("✅ " + data.message);
      setPw({ oldPassword: "", newPassword: "" });
    } catch (err) {
      setPwMsg("❌ " + (err.response?.data?.message || "Error"));
    }
  };

  const readReceipts = user.settings?.readReceipts !== false;
  const showLastSeen = user.settings?.showLastSeen !== false;
  const showPhone = !!user.privacy?.showPhone;
  const showEmail = !!user.privacy?.showEmail;

  const handleAccountToggle = async () => {
    try {
      if (accountStatus === "deactivated") {
        const { data } = await api.post("/auth/reactivate");
        setUser(data.user);
        setAccountStatus("active");
        setMsg("✅ Account reactivated successfully");
        return;
      }

      const ok = window.confirm("Do you want to deactivate your account? If you do not reactivate it within 48 hours, it will be permanently deleted.");
      if (!ok) return;

      const { data } = await api.post("/auth/deactivate");
      setUser(data.user);
      setAccountStatus("deactivated");
      setMsg("✅ Account deactivated successfully");
    } catch (err) {
      setMsg("❌ " + (err.response?.data?.message || "Error"));
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-100">
      <div className="h-36 bg-linear-to-r from-[#00a884] to-[#25d366]" />
      <div className="max-w-2xl mx-auto px-4 pb-10 -mt-16">
        <div className="flex flex-col items-center mb-5">
          <div className="p-1 bg-white rounded-full shadow-lg">
            <Avatar src={preview} name={user.name} size={112} />
          </div>
          <h1 className="text-xl font-bold mt-2 text-gray-800">{user.name}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        <Card title="✏️ Edit info">
          <form onSubmit={save} className="space-y-3">
            <div>
              <label className="text-xs text-gray-500">Profile photo</label>
              <input type="file" accept="image/*" className="block text-sm mt-1"
                onChange={(e) => {
                  const f = e.target.files[0];
                  if (f) { setFile(f); setPreview(URL.createObjectURL(f)); }
                }} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Name</label>
              <input className={inp} value={form.name} onChange={set("name")} required />
            </div>
            <div>
              <label className="text-xs text-gray-500">Phone</label>
              <PhoneInput international defaultCountry="IN" value={form.phone}
                onChange={(p) => setForm({ ...form, phone: p || "" })} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Gender</label>
              <select className={inp} value={form.gender} onChange={set("gender")}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500">Bio</label>
              <textarea className={inp} rows={2} value={form.bio} onChange={set("bio")} />
            </div>
            <div>
              <label className="text-xs text-gray-500">Education</label>
              <input className={inp} value={form.education} onChange={set("education")} />
            </div>
            <div className="flex items-center gap-3">
              <Btn disabled={saving}>{saving ? "Saving..." : "Save changes"}</Btn>
              <span className="text-sm">{msg}</span>
            </div>
          </form>
        </Card>

        <Card title="🔒 Privacy">
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-800">Account status</p>
                  <p className="text-xs text-gray-600">
                    {accountStatus === "deactivated"
                      ? "Your account is deactivated. Reactivate within 48 hours or it will be permanently deleted."
                      : "If you deactivate your account, you must reactivate it within 48 hours or it will be permanently deleted."}
                  </p>
                </div>
                <button
                  onClick={handleAccountToggle}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold cursor-pointer ${accountStatus === "deactivated" ? "bg-emerald-600 text-white" : "bg-red-500 text-white"}`}>
                  {accountStatus === "deactivated" ? "Reactivate" : "Deactivate"}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Read receipts</p>
                <p className="text-xs text-gray-500">
                  When turned off, read receipts will not be shown to either side.
                </p>
              </div>
              <Toggle on={readReceipts} onChange={(v) => setting({ readReceipts: v })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Last seen</p>
                <p className="text-xs text-gray-500">When turned off, others will not be able to see your last seen.</p>
              </div>
              <Toggle on={showLastSeen} onChange={(v) => setting({ showLastSeen: v })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Phone visibility</p>
                <p className="text-xs text-gray-500">Enable this to show your phone number only to friends.</p>
              </div>
              <Toggle on={showPhone} onChange={(v) => setting({ privacy: { showPhone: v } })} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-800">Email visibility</p>
                <p className="text-xs text-gray-500">Enable this to show your email only to friends.</p>
              </div>
              <Toggle on={showEmail} onChange={(v) => setting({ privacy: { showEmail: v } })} />
            </div>
          </div>
        </Card>

        <Card title="👥 Friends">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-gray-700">
              <Users className="h-4 w-4 text-[#00a884]" />
              <span className="text-sm font-medium">Total friends</span>
            </div>
            <span className="rounded-full bg-[#eafaf5] text-[#00a884] px-2.5 py-1 text-xs font-semibold">{friends.length}</span>
          </div>
          {friends.length === 0 && <p className="text-sm text-gray-400">No accepted friends yet.</p>}
          <div className="space-y-2">
            {friends.map((f) => (
              <div key={f._id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={f.profilePic} name={f.name} size={36} online={f.isOnline} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{f.name}</p>
                    <p className="text-[11px] text-gray-500">{f.isOnline ? "online" : "offline"}</p>
                  </div>
                </div>
                <button onClick={() => navigate(`/chats?user=${f._id}`)} className="text-xs font-medium text-[#00a884] cursor-pointer hover:underline">
                  Message
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="🚫 Blocked users">
          {blocked.length === 0 && <p className="text-sm text-gray-400">No blocked users</p>}
          {blocked.map((b) => (
            <div key={b._id} className="flex items-center gap-3 py-2">
              <Avatar src={b.profilePic} name={b.name} size={40} />
              <span className="flex-1 text-sm font-medium">{b.name}</span>
              <Btn color="gray" onClick={() => api.delete(`/users/block/${b._id}`).then(loadBlocked)}>Unblock</Btn>
            </div>
          ))}
        </Card>

        <Card title="🔑 Change password">
          <form onSubmit={changePw} className="space-y-3">
            <input type="password" autoComplete="current-password" className={inp} placeholder="Old password"
              value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} required />
            <input type="password" autoComplete="new-password" className={inp} placeholder="New password (min 6)"
              value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} minLength={6} required />
            <div className="flex items-center gap-3">
              <Btn>Update password</Btn>
              <span className="text-sm">{pwMsg}</span>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}