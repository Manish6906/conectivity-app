import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import Btn from "../components/Btn";

export default function Requests() {
  const { socket } = useApp();
  const [tab, setTab] = useState("sent");
  const [sent, setSent] = useState([]);
  const [received, setReceived] = useState([]);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([api.get("/friends/sent"), api.get("/friends/received")]);
    setSent(s.data.requests);
    setReceived(r.data.requests);
  }, []);

  useEffect(() => {
    load();
    socket.on("friends:changed", load);
    return () => socket.off("friends:changed", load);
  }, [socket, load]);

  const act = async (fn) => {
    try { await fn(); await load(); } catch (e) { alert(e.response?.data?.message || "Error"); }
  };

  const list = tab === "sent" ? sent : received;
  const tabCls = (t) =>
    `flex-1 py-2.5 text-sm font-medium rounded-lg transition cursor-pointer ${
      tab === t ? "bg-[#00a884] text-white shadow" : "text-gray-600 hover:bg-gray-100"
    }`;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Friend Requests</h1>

        <div className="flex gap-2 bg-white p-1.5 rounded-xl shadow-sm mb-5">
          <button className={tabCls("sent")} onClick={() => setTab("sent")}>Sent ({sent.length})</button>
          <button className={tabCls("received")} onClick={() => setTab("received")}>Received ({received.length})</button>
        </div>

        {list.length === 0 && (
          <div className="text-center text-gray-400 py-16">
            <p className="text-5xl mb-2">📭</p>
            <p>{tab === "sent" ? "You have not sent any requests" : "No new requests"}</p>
          </div>
        )}

        <div className="space-y-3">
          {list.map((r) => (
            <div key={r._id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
              <Avatar src={r.user.profilePic} name={r.user.name} size={52} online={r.user.isOnline} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate">{r.user.name}</p>
                <p className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</p>
              </div>
              {tab === "sent" ? (
                <Btn color="red" onClick={() => act(() => api.delete(`/friends/request/${r._id}`))}>Cancel</Btn>
              ) : (
                <div className="flex gap-2">
                  <Btn onClick={() => act(() => api.put(`/friends/accept/${r._id}`))}>Accept</Btn>
                  <Btn color="red" onClick={() => act(() => api.put(`/friends/reject/${r._id}`))}>Reject</Btn>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}