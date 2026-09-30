import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import Btn from "../components/Btn";

export default function Rejected() {
  const { socket } = useApp();
  const [list, setList] = useState([]);

  const load = useCallback(
    () => api.get("/friends/rejected").then((r) => setList(r.data.requests)),
    []
  );

  useEffect(() => {
    load();
    socket.on("friends:changed", load);
    return () => socket.off("friends:changed", load);
  }, [socket, load]);

  const act = async (fn) => {
    try { await fn(); await load(); } catch (e) { alert(e.response?.data?.message || "Error"); }
  };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800">Rejected</h1>
        <p className="text-sm text-gray-500 mb-5">People who declined your friend request</p>

        {list.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <p className="text-5xl mb-2">🙌</p>
            <p>No one has rejected you</p>
          </div>
        )}

        <div className="space-y-3">
          {list.map((r) => (
            <div key={r._id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3 border-l-4 border-red-400">
              <Avatar src={r.user.profilePic} name={r.user.name} size={52} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{r.user.name}</p>
                <p className="text-xs text-red-500">Rejected on {new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex gap-2">
                <Btn onClick={() => act(() => api.post(`/friends/request/${r.user._id}`))}>Request again</Btn>
                <Btn color="gray" onClick={() => act(() => api.delete(`/friends/request/${r._id}`))}>Remove</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}