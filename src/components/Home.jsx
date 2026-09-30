import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

// Demo contacts for prototype layout only.
const CONTACTS = [
  { id: 1, name: "Rahul Sharma", last: "Kal milte hain 👍", time: "10:24", unread: 2 },
  { id: 2, name: "Priya Verma", last: "Photo bhej do", time: "09:12", unread: 0 },
  { id: 3, name: "Amit Singh", last: "Ok done ✅", time: "Yesterday", unread: 0 },
  { id: 4, name: "Neha Gupta", last: "Happy Birthday 🎉", time: "Yesterday", unread: 1 },
  { id: 5, name: "Family Group", last: "Mummy: Khana ready hai", time: "Mon", unread: 5 },
];

const avatarOf = (name) =>
  `https://ui-avatars.com/api/?background=random&color=fff&name=${encodeURIComponent(name)}`;

const LogoutIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const SendIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
  </svg>
);

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(null); // selected contact
  const [showProfile, setShowProfile] = useState(true);
  const [text, setText] = useState("");
  const [chats, setChats] = useState({}); // { contactId: [{me, text, time}] }
  const bottomRef = useRef(null);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem("token");
        navigate("/login");
      });
  }, [navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chats, active]);

  const logout = () => {
    if (!window.confirm("Are you sure you want to logout?")) return;
    localStorage.removeItem("token");
    navigate("/login");
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!text.trim() || !active) return;
    const msg = {
      me: true,
      text: text.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChats((prev) => ({ ...prev, [active.id]: [...(prev[active.id] || []), msg] }));
    setText("");
  };

  if (!user)
    return (
      <div className="h-screen flex items-center justify-center bg-[#f0f2f5] text-gray-500">
        Loading...
      </div>
    );

  const filtered = CONTACTS.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );
  const messages = active ? chats[active.id] || [] : [];

  return (
    <div className="h-screen w-full bg-[#d1d7db] flex items-center justify-center">
      <div className="flex w-full h-full xl:w-[1400px] xl:h-[95vh] bg-white shadow-xl overflow-hidden">
        {/* ============ LEFT SIDEBAR ============ */}
        <aside
          className={`w-full md:w-[380px] border-r border-gray-200 flex flex-col ${
            active ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between">
            <button
              onClick={() => {
                setActive(null);
                setShowProfile(true);
              }}
              className="flex items-center gap-3 cursor-pointer"
              title="My profile"
            >
              <img
                src={user.profilePic}
                alt="me"
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="font-semibold text-gray-800">{user.name}</span>
            </button>
            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-full text-gray-600 hover:bg-gray-200 hover:text-red-500 transition cursor-pointer"
            >
              <LogoutIcon />
            </button>
          </div>

          {/* Search */}
          <div className="p-2 bg-white">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or start new chat"
              className="w-full bg-[#f0f2f5] rounded-lg px-4 py-2 text-sm outline-none"
            />
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="text-center text-gray-400 mt-8 text-sm">No chats found</p>
            )}
            {filtered.map((c) => (
              <div
                key={c.id}
                onClick={() => setActive(c)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-[#f5f6f6] ${
                  active?.id === c.id ? "bg-[#f0f2f5]" : ""
                }`}
              >
                <img src={avatarOf(c.name)} alt={c.name} className="w-12 h-12 rounded-full" />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-900 truncate">{c.name}</p>
                    <span className={`text-xs ${c.unread ? "text-[#00a884]" : "text-gray-500"}`}>
                      {c.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-500 truncate">{c.last}</p>
                    {c.unread > 0 && (
                      <span className="ml-2 bg-[#00a884] text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* ============ RIGHT PANEL ============ */}
        <main className={`flex-1 flex-col ${active ? "flex" : "hidden md:flex"}`}>
          {active ? (
            <>
              {/* Chat header */}
              <div className="h-16 bg-[#f0f2f5] px-4 flex items-center gap-3">
                <button
                  onClick={() => setActive(null)}
                  className="md:hidden text-xl text-gray-600 cursor-pointer"
                >
                  ←
                </button>
                <img src={avatarOf(active.name)} alt="" className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-medium text-gray-900 leading-tight">{active.name}</p>
                  <p className="text-xs text-gray-500">online</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto bg-[#efeae2] px-6 py-4 space-y-2">
                <div className="flex justify-start">
                  <div className="bg-white rounded-lg rounded-tl-none px-3 py-2 max-w-[70%] shadow-sm">
                    <p className="text-sm">{active.last}</p>
                    <p className="text-[10px] text-gray-400 text-right">{active.time}</p>
                  </div>
                </div>
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.me ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`rounded-lg px-3 py-2 max-w-[70%] shadow-sm ${
                        m.me ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"
                      }`}
                    >
                      <p className="text-sm break-words">{m.text}</p>
                      <p className="text-[10px] text-gray-500 text-right">{m.time}</p>
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={sendMessage} className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-3">
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Type a message"
                  className="flex-1 bg-white rounded-lg px-4 py-2.5 text-sm outline-none"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-full bg-[#00a884] text-white hover:bg-[#019173] cursor-pointer"
                >
                  <SendIcon />
                </button>
              </form>
            </>
          ) : (
            /* ===== My profile view ===== */
            <div className="flex-1 overflow-y-auto bg-[#f0f2f5]">
              <div className="h-40 bg-gradient-to-r from-[#00a884] to-[#25d366]" />
              <div className="max-w-xl mx-auto -mt-16 px-4 pb-10">
                <div className="bg-white rounded-2xl shadow-md p-6 text-center">
                  <img
                    src={user.profilePic}
                    alt="profile"
                    className="w-32 h-32 rounded-full object-cover mx-auto -mt-20 border-4 border-white shadow"
                  />
                  <h2 className="text-2xl font-bold mt-3 text-gray-800">{user.name}</h2>
                  <p className="text-gray-500 text-sm capitalize">{user.gender}</p>
                  <p className="mt-3 text-gray-600 italic">
                    {user.bio || "No bio added yet"}
                  </p>
                </div>

                <div className="bg-white rounded-2xl shadow-md p-6 mt-4 space-y-4">
                  <Info icon="🎓" label="Education" value={user.education || "—"} />
                  <Info icon="✉️" label="Email" value={user.email} />
                  <Info icon="📞" label="Phone" value={user.phone} />
                </div>

                <button
                  onClick={logout}
                  className="mt-6 w-full py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition cursor-pointer"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function Info({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div className="text-left">
        <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-gray-800 break-all">{value}</p>
      </div>
    </div>
  );
}

export default Home;