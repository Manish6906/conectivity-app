import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import Btn from "../components/Btn";

const Tag = ({ children, color = "bg-gray-100 text-gray-600" }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${color}`}>{children}</span>
);

export default function Users() {
  const { socket } = useApp();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () => api.get("/users").then((r) => setUsers(r.data.users)).finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
    const onPresence = (p) =>
      setUsers((prev) =>
        prev.map((u) => (u._id === p.userId ? { ...u, isOnline: p.isOnline, lastSeen: p.lastSeen } : u))
      );
    socket.on("friends:changed", load);
    socket.on("presence", onPresence);
    return () => {
      socket.off("friends:changed", load);
      socket.off("presence", onPresence);
    };
  }, [socket, load]);

  const act = async (fn) => {
    try {
      await fn();
      await load();
    } catch (e) {
      alert(e.response?.data?.message || "Something went wrong");
    }
  };

  const filtered = users.filter((u) => u.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">People</h1>
            <p className="text-sm text-gray-500">All registered users</p>
          </div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Search by name"
            className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:border-[#00a884] md:w-72" />
        </div>

        {loading && <p className="text-gray-400">Loading...</p>}
        {!loading && filtered.length === 0 && <p className="text-gray-400">No user found</p>}

        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((u) => (
            <div key={u._id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar src={u.profilePic} name={u.name} size={56} online={u.isOnline} />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.bio || "Hey there! I am using this app"}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {u.relation === "none" && (
                  <Btn onClick={() => act(() => api.post(`/friends/request/${u._id}`))}>➕ Add friend</Btn>
                )}
                {u.relation === "sent" && (
                  <>
                    <Tag color="bg-amber-100 text-amber-700">Request sent</Tag>
                    <Btn color="gray" onClick={() => act(() => api.delete(`/friends/request/${u.requestId}`))}>Cancel</Btn>
                  </>
                )}
                {u.relation === "received" && (
                  <>
                    <Btn onClick={() => act(() => api.put(`/friends/accept/${u.requestId}`))}>Accept</Btn>
                    <Btn color="red" onClick={() => act(() => api.put(`/friends/reject/${u.requestId}`))}>Reject</Btn>
                  </>
                )}
                {u.relation === "rejected" && (
                  <>
                    <Tag color="bg-red-100 text-red-600">Rejected</Tag>
                    <Btn onClick={() => act(() => api.post(`/friends/request/${u._id}`))}>Send again</Btn>
                  </>
                )}
                {u.relation === "friends" && (
                  <>
                    <Btn onClick={() => navigate(`/chats?user=${u._id}`)}>💬 Message</Btn>
                    <Btn color="red" onClick={() =>
                      window.confirm(`${u.name} ko block karna hai?`) && act(() => api.post(`/users/block/${u._id}`))}>
                      Block
                    </Btn>
                  </>
                )}
                {u.relation === "blocked" && (
                  <>
                    <Tag color="bg-red-100 text-red-600">Blocked</Tag>
                    <Btn color="gray" onClick={() => act(() => api.delete(`/users/block/${u._id}`))}>Unblock</Btn>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}