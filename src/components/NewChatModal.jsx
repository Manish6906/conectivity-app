import { useEffect, useState } from "react";
import api from "../api";
import Avatar from "./Avatar";

export default function NewChatModal({ onClose, onDirect, onGroupCreated }) {
  const [friends, setFriends] = useState([]);
  const [mode, setMode] = useState("list"); // list | group
  const [sel, setSel] = useState([]);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    api.get("/friends").then((r) => setFriends(r.data.friends));
  }, []);

  const toggle = (id) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const createGroup = async () => {
    try {
      const { data } = await api.post("/chats/group", { name, members: sel });
      onGroupCreated(data.chat);
    } catch (e) {
      setErr(e.response?.data?.message || "Error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#00a884] text-white px-5 py-4 flex items-center justify-between">
          <h3 className="font-semibold">{mode === "list" ? "New chat" : "New group"}</h3>
          <button onClick={onClose} className="text-xl cursor-pointer">✕</button>
        </div>

        {mode === "group" && (
          <div className="p-3 border-b">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Group name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#00a884]" />
            {err && <p className="text-red-500 text-xs mt-1">{err}</p>}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {mode === "list" && (
            <button onClick={() => setMode("group")}
              className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer border-b">
              <span className="w-11 h-11 rounded-full bg-[#00a884] text-white flex items-center justify-center text-xl">👥</span>
              <span className="font-medium">New group</span>
            </button>
          )}

          {friends.length === 0 && (
            <p className="text-center text-gray-400 text-sm p-6">
              No friends yet. Send a request from the People page.
            </p>
          )}

          {friends.map((f) => (
            <div key={f._id}
              onClick={() => (mode === "list" ? onDirect(f._id) : toggle(f._id))}
              className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 cursor-pointer">
              <Avatar src={f.profilePic} name={f.name} size={44} online={f.isOnline} />
              <span className="flex-1 font-medium text-gray-800">{f.name}</span>
              {mode === "group" && (
                <input type="checkbox" checked={sel.includes(f._id)} readOnly className="w-4 h-4 accent-[#00a884]" />
              )}
            </div>
          ))}
        </div>

        {mode === "group" && (
          <div className="p-3 border-t flex gap-2">
            <button onClick={() => setMode("list")} className="flex-1 py-2 rounded-lg bg-gray-100 cursor-pointer">Back</button>
            <button onClick={createGroup} disabled={!name.trim() || sel.length === 0}
              className="flex-1 py-2 rounded-lg bg-[#00a884] text-white disabled:opacity-40 cursor-pointer">
              Create ({sel.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}