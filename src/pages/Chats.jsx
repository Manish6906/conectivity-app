import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import { useApp } from "../context/AppContext";
import Avatar from "../components/Avatar";
import Ticks from "../components/Ticks";
import Modal from "../components/NewChatModal";
import { fmtTime, fmtListTime, dayLabel, lastSeenText } from "../utils/time";

const metaOf = (c, meId) => {
  if (c.isGroup) return { name: c.name, pic: null, other: null };
  const o = c.members.find((m) => m._id !== meId) || c.members[0];
  return { name: o.name, pic: o.profilePic, other: o };
};

export default function Chats() {
  const { user, socket } = useApp();
  const [params, setParams] = useSearchParams();

  const [chats, setChats] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState({}); // chatId -> []
  const [typing, setTyping] = useState({});     // chatId -> userId
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [menu, setMenu] = useState(false);
  const [groupInfo, setGroupInfo] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [err, setErr] = useState("");

  const activeRef = useRef(null);
  const chatsRef = useRef([]);
  const bottomRef = useRef(null);
  const messagePanelRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const lastReadEmitRef = useRef({});
  const typingTimer = useRef(null);
  const isTypingRef = useRef(false);
  activeRef.current = activeId;
  chatsRef.current = chats;

  const flash = (m) => {
    setErr(m);
    setTimeout(() => setErr(""), 3000);
  };

  const playIncomingMessageSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.06;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      const now = context.currentTime;
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      oscillator.stop(now + 0.18);
      setTimeout(() => context.close(), 220);
    } catch (error) {
      // Ignore browser audio restrictions silently.
    }
  }, []);

  const chat = chats.find((c) => c._id === activeId);
  const meta = chat ? metaOf(chat, user._id) : null;
  const msgs = messages[activeId] || [];

  // ---------- chats list ----------
  const loadChats = useCallback(async () => {
    const r = await api.get("/chats");
    setChats((prev) => {
      const list = r.data.chats;
      const keep = prev.find((c) => c._id === activeRef.current && !list.some((l) => l._id === c._id));
      return keep ? [keep, ...list] : list;
    });
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  // ---------- People page se "Message" click ----------
  const startDirect = useCallback(async (userId) => {
    try {
      const { data } = await api.post(`/chats/direct/${userId}`);
      setChats((p) => (p.some((c) => c._id === data.chat._id) ? p : [data.chat, ...p]));
      setActiveId(data.chat._id);
      setShowNew(false);
    } catch (e) {
      flash(e.response?.data?.message || "Unable to open chat");
    }
  }, []);

  useEffect(() => {
    const uid = params.get("user");
    if (uid) {
      startDirect(uid);
      setParams({}, { replace: true });
    }
  }, [params, setParams, startDirect]);

  const markChatRead = useCallback((chatId) => {
    if (!chatId) return;
    const now = Date.now();
    const last = lastReadEmitRef.current[String(chatId)] || 0;
    if (now - last < 1200) return;
    lastReadEmitRef.current[String(chatId)] = now;
    socket.emit("message:read", { chatId });
  }, [socket]);

  // ---------- chat kholne par messages + read ----------
  useEffect(() => {
    if (!activeId) return;
    shouldStickToBottomRef.current = true;
    api.get(`/chats/${activeId}/messages`).then((r) => {
      setMessages((p) => ({ ...p, [activeId]: r.data.messages }));
      markChatRead(activeId);
      setChats((p) => p.map((c) => (c._id === activeId ? { ...c, unread: 0 } : c)));
    });
  }, [activeId, markChatRead]);

  const openUserInfo = useCallback(async () => {
    if (!chat || chat.isGroup || !meta?.other?._id) return;
    try {
      const { data } = await api.get(`/users/profile/${meta.other._id}`);
      setUserInfo(data.user);
    } catch {
      setUserInfo({ ...meta.other, email: "", phone: "", bio: "", education: "" });
    }
  }, [chat, meta?.other?._id]);

  // ---------- socket events ----------
  useEffect(() => {
    const onNew = (m) => {
      let duplicate = false;
      setMessages((p) => {
        const list = p[m.chat] || [];
        if (list.some((x) => x._id === m._id)) {
          duplicate = true;
          return p;
        }
        return { ...p, [m.chat]: [...list, m] };
      });
      if (duplicate) {
        setTyping((p) => ({ ...p, [m.chat]: null }));
        return;
      }
      setTyping((p) => ({ ...p, [m.chat]: null }));

      const isActive = activeRef.current === m.chat && document.visibilityState === "visible";
      const mine = m.sender === user._id;

      if (!mine) playIncomingMessageSound();

      if (!chatsRef.current.some((c) => c._id === m.chat)) {
        loadChats();
      } else {
        setChats((p) => {
          const c = p.find((x) => x._id === m.chat);
          if (!c) return p;
          const hasSameLastMessage = c.lastMessage?._id === m._id;
          if (hasSameLastMessage) return p;
          const unreadDelta = mine || isActive ? 0 : 1;
          const upd = { ...c, lastMessage: m, unread: Math.max(0, c.unread + unreadDelta) };
          return [upd, ...p.filter((x) => x._id !== m.chat)];
        });
      }
      if (!mine && isActive) markChatRead(m.chat);
    };

    // tick update (delivered / seen)
    const onUpdate = (m) => {
      setMessages((p) =>
        p[m.chat] ? { ...p, [m.chat]: p[m.chat].map((x) => (x._id === m._id ? m : x)) } : p
      );
      setChats((p) => p.map((c) => (c.lastMessage?._id === m._id ? { ...c, lastMessage: m } : c)));
    };

    const onPresence = (pr) =>
      setChats((p) =>
        p.map((c) => ({
          ...c,
          members: c.members.map((mm) =>
            mm._id === pr.userId ? { ...mm, isOnline: pr.isOnline, lastSeen: pr.lastSeen } : mm
          ),
        }))
      );

    const onTyping = (t) => setTyping((p) => ({ ...p, [t.chatId]: t.isTyping ? t.userId : null }));
    const onChatRead = ({ chatId }) =>
      setChats((p) => p.map((c) => (c._id === chatId ? { ...c, unread: 0 } : c)));

    const onVisible = () => {
      if (document.visibilityState === "visible" && activeRef.current) {
        markChatRead(activeRef.current);
        setChats((p) => p.map((c) => (c._id === activeRef.current ? { ...c, unread: 0 } : c)));
      }
    };

    socket.on("message:new", onNew);
    socket.on("message:update", onUpdate);
    socket.on("presence", onPresence);
    socket.on("typing", onTyping);
    socket.on("chat:read", onChatRead);
    socket.on("chats:changed", loadChats);
    socket.on("friends:changed", loadChats);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:update", onUpdate);
      socket.off("presence", onPresence);
      socket.off("typing", onTyping);
      socket.off("chat:read", onChatRead);
      socket.off("chats:changed", loadChats);
      socket.off("friends:changed", loadChats);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [socket, user._id, loadChats, playIncomingMessageSound, markChatRead]);

  useEffect(() => {
    const panel = messagePanelRef.current;
    if (!panel) return;
    const onScroll = () => {
      const nearBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight < 160;
      shouldStickToBottomRef.current = nearBottom;
    };
    panel.addEventListener("scroll", onScroll, { passive: true });
    return () => panel.removeEventListener("scroll", onScroll);
  }, [activeId]);

  useEffect(() => {
    const panel = messagePanelRef.current;
    if (!panel) return;

    const isNearBottom = panel.scrollHeight - panel.scrollTop - panel.clientHeight <= 160;
    const isOwnMessage = msgs.length && msgs[msgs.length - 1]?.sender === user._id;
    const shouldScroll = shouldStickToBottomRef.current || isOwnMessage;

    if (!shouldScroll || (!isNearBottom && !shouldStickToBottomRef.current && !isOwnMessage)) {
      return;
    }

    requestAnimationFrame(() => {
      const current = messagePanelRef.current;
      if (!current) return;
      const stillNearBottom = current.scrollHeight - current.scrollTop - current.clientHeight <= 160;
      if (!stillNearBottom && !shouldStickToBottomRef.current && !isOwnMessage) return;
      current.scrollTo({ top: current.scrollHeight, behavior: "smooth" });
    });
  }, [messages, activeId, typing, user._id, msgs]);

  // ---------- send + typing ----------
  const stopTyping = () => {
    clearTimeout(typingTimer.current);
    if (isTypingRef.current && activeId) {
      socket.emit("typing", { chatId: activeId, isTyping: false });
      isTypingRef.current = false;
    }
  };

  const onType = (e) => {
    setText(e.target.value);
    if (!isTypingRef.current) {
      socket.emit("typing", { chatId: activeId, isTyping: true });
      isTypingRef.current = true;
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 1500);
  };

  const send = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !activeId) return;
    socket.emit("message:send", { chatId: activeId, text: t }, (res) => {
      if (!res?.ok) flash(res?.error || "Message failed to send");
    });
    setText("");
    stopTyping();
  };

  const toggleBlock = async (other, isBlocked) => {
    if (!isBlocked && !window.confirm(`${other.name} ko block karna hai?`)) return;
    isBlocked
      ? await api.delete(`/users/block/${other._id}`)
      : await api.post(`/users/block/${other._id}`);
    setMenu(false);
    loadChats();
  };

  // ---------- render helpers ----------
  const filtered = chats.filter((c) =>
    metaOf(c, user._id).name.toLowerCase().includes(search.toLowerCase())
  );

  const subtitle = () => {
    const typer = typing[chat._id];
    if (typer) {
      const n = chat.members.find((m) => m._id === typer)?.name.split(" ")[0];
      return chat.isGroup ? `${n} is typing...` : "typing...";
    }
    if (chat.isGroup)
      return chat.members.map((m) => (m._id === user._id ? "You" : m.name.split(" ")[0])).join(", ");
    return meta.other.isOnline ? "online" : lastSeenText(meta.other.lastSeen);
  };

  const preview = (c) => {
    const m = c.lastMessage;
    if (!m) return c.isGroup ? "Group created" : "";
    const who =
      c.isGroup && m.sender !== user._id
        ? (c.members.find((x) => x._id === m.sender)?.name.split(" ")[0] || "") + ": "
        : c.isGroup ? "You: " : "";
    return who + m.text;
  };

  return (
    <div className="h-full flex bg-white">
      {/* ============ SIDEBAR ============ */}
      <aside className={`w-full md:w-[360px] lg:w-[400px] border-r border-gray-200 flex-col ${activeId ? "hidden md:flex" : "flex"}`}>
        <div className="h-16 bg-[#f0f2f5] px-4 flex items-center justify-between shrink-0">
          <h1 className="text-xl font-bold text-gray-800">Chats</h1>
          <button onClick={() => setShowNew(true)} title="New chat / group"
            className="w-9 h-9 rounded-full bg-[#00a884] text-white text-xl hover:bg-[#019173] cursor-pointer">＋</button>
        </div>

        <div className="p-2 shrink-0">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search chats"
            className="w-full bg-[#f0f2f5] rounded-lg px-4 py-2 text-sm outline-none" />
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="text-center text-gray-400 mt-12 px-6 text-sm">
              <p className="text-4xl mb-2">💬</p>
              No chats yet. Tap + to start a conversation.
            </div>
          )}

          {filtered.map((c) => {
            const mt = metaOf(c, user._id);
            const typer = typing[c._id];
            return (
              <div key={c._id} onClick={() => setActiveId(c._id)}
                className={`flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-[#f5f6f6] ${activeId === c._id ? "bg-[#f0f2f5]" : ""}`}>
                <Avatar src={mt.pic} name={mt.name} size={50} online={!c.isGroup && mt.other?.isOnline} />
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-900 truncate">
                      {c.isGroup && "👥 "}{mt.name}
                    </p>
                    {c.lastMessage && (
                      <span className={`text-xs ${c.unread ? "text-[#00a884]" : "text-gray-500"}`}>
                        {fmtListTime(c.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1 min-w-0 text-sm text-gray-500">
                      {typer ? (
                        <span className="text-[#00a884]">typing...</span>
                      ) : (
                        <>
                          {c.lastMessage?.sender === user._id && <Ticks status={c.lastMessage.status} />}
                          <span className="truncate">{preview(c)}</span>
                        </>
                      )}
                    </div>
                    {c.unread > 0 && (
                      <span className="bg-[#00a884] text-white text-xs rounded-full min-w-5 h-5 px-1.5 flex items-center justify-center">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ============ CHAT WINDOW ============ */}
      <section className={`flex-1 min-w-0 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
        {!chat ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] text-gray-500 text-center px-6">
            <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-[28px] bg-[#00a884] shadow-lg shadow-[#00a884]/30">
              <MessageSquareText className="h-12 w-12 text-white" strokeWidth={2.2} />
            </div>
            <h2 className="text-2xl font-light text-gray-700">Live Chat</h2>
            <p className="text-sm mt-2 text-gray-600">Select a chat or create a new one with +</p>
          </div>
        ) : (
          <>
            {/* header */}
            <div className="h-16 bg-[#f0f2f5] px-3 md:px-4 flex items-center gap-3 shrink-0 relative">
              <button onClick={() => setActiveId(null)} className="md:hidden text-2xl text-gray-600 cursor-pointer">←</button>
              <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={openUserInfo}>
                <Avatar src={meta.pic} name={meta.name} size={42} online={!chat.isGroup && meta.other?.isOnline} />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate leading-tight">{meta.name}</p>
                  <p className={`text-xs truncate ${typing[chat._id] || (!chat.isGroup && meta.other?.isOnline) ? "text-[#00a884]" : "text-gray-500"}`}>
                    {subtitle()}
                  </p>
                </div>
              </div>
              <button onClick={() => setMenu(!menu)} className="text-2xl px-2 text-gray-600 cursor-pointer">⋮</button>
              {menu && (
                <div className="absolute right-3 top-14 bg-white rounded-lg shadow-xl border z-20 py-1 min-w-40">
                  {chat.isGroup ? (
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer"
                      onClick={() => { setGroupInfo(true); setMenu(false); }}>Group info</button>
                  ) : (
                    <button className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-600 cursor-pointer"
                      onClick={() => toggleBlock(meta.other, chat.iBlocked)}>
                      {chat.iBlocked ? "Unblock" : "Block"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* messages */}
            <div ref={messagePanelRef} className="flex-1 overflow-y-auto px-3 md:px-8 py-4 bg-[#efeae2]"
              style={{ backgroundImage: "radial-gradient(#d9d2c5 1px, transparent 1px)", backgroundSize: "18px 18px" }}
              onClick={() => setMenu(false)}>
              {msgs.length === 0 && (
                <p className="text-center text-xs text-gray-500 bg-white/70 rounded-lg py-2 px-3 w-fit mx-auto">
                  Send your first message 👋
                </p>
              )}

              {msgs.map((m, i) => {
                const mine = m.sender === user._id;
                const showDay = i === 0 || dayLabel(msgs[i - 1].createdAt) !== dayLabel(m.createdAt);
                const sender = chat.members.find((x) => x._id === m.sender);
                return (
                  <div key={m._id}>
                    {showDay && (
                      <div className="flex justify-center my-3">
                        <span className="bg-white/90 text-gray-600 text-xs px-3 py-1 rounded-lg shadow-sm">
                          {dayLabel(m.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex mb-1 ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`px-3 py-1.5 max-w-[85%] md:max-w-[65%] rounded-xl shadow-sm ${mine ? "bg-[#d9fdd3] rounded-tr-none" : "bg-white rounded-tl-none"}`}>
                        {chat.isGroup && !mine && (
                          <p className="text-xs font-semibold text-teal-600">{sender?.name}</p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{m.text}</p>
                        <div className="flex items-center justify-end gap-1 -mb-0.5">
                          <span className="text-[10px] text-gray-500">{fmtTime(m.createdAt)}</span>
                          {mine && <Ticks status={m.status} />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {typing[chat._id] && (
                <div className="flex justify-start mb-1">
                  <div className="bg-white rounded-xl rounded-tl-none px-4 py-2 shadow-sm text-gray-400 tracking-widest animate-pulse">
                    •••
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {err && (
              <div className="bg-red-500 text-white text-sm text-center py-1.5">{err}</div>
            )}

            {/* composer */}
            {chat.iBlocked ? (
              <div className="bg-[#f0f2f5] px-4 py-4 text-center text-sm text-gray-600">
                You have blocked this contact.{" "}
                <button className="text-[#00a884] font-semibold cursor-pointer"
                  onClick={() => toggleBlock(meta.other, true)}>Unblock</button>{" "}
                to send a message.
              </div>
            ) : (
              <form onSubmit={send} className="bg-[#f0f2f5] px-3 md:px-4 py-3 flex items-center gap-3 shrink-0">
                <input value={text} onChange={onType} onBlur={stopTyping} placeholder="Type a message"
                  className="flex-1 bg-white rounded-full px-5 py-2.5 text-sm outline-none" />
                <button type="submit" disabled={!text.trim()}
                  className="w-11 h-11 rounded-full bg-[#00a884] text-white flex items-center justify-center hover:bg-[#019173] disabled:opacity-40 cursor-pointer">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z" /></svg>
                </button>
              </form>
            )}
          </>
        )}
      </section>

      {/* ============ MODALS ============ */}
      {showNew && (
        <Modal
          onClose={() => setShowNew(false)}
          onDirect={startDirect}
          onGroupCreated={(c) => {
            setChats((p) => [c, ...p.filter((x) => x._id !== c._id)]);
            setActiveId(c._id);
            setShowNew(false);
          }}
        />
      )}

      {groupInfo && chat?.isGroup && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setGroupInfo(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#00a884] text-white p-5 text-center">
              <Avatar name={chat.name} size={72} />
              <h3 className="font-semibold text-lg mt-2">{chat.name}</h3>
              <p className="text-xs opacity-80">{chat.members.length} members</p>
            </div>
            {chat.members.map((m) => (
              <div key={m._id} className="flex items-center gap-3 px-5 py-3">
                <Avatar src={m.profilePic} name={m.name} size={40} online={m.isOnline} />
                <span className="flex-1 text-sm font-medium">{m._id === user._id ? "You" : m.name}</span>
                {m._id === chat.admin && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Admin</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!chat?.isGroup && userInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setUserInfo(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-[#00a884] text-white p-5 text-center">
              <Avatar src={userInfo.profilePic} name={userInfo.name} size={72} online={userInfo.isOnline} />
              <h3 className="font-semibold text-lg mt-2">{userInfo.name}</h3>
              <p className="text-xs opacity-80">{userInfo.isOnline ? "online" : userInfo.lastSeen ? `last seen ${new Date(userInfo.lastSeen).toLocaleString()}` : "offline"}</p>
            </div>
            <div className="p-5 space-y-3 text-sm text-gray-700">
              <div className="flex items-center gap-3"><span className="text-[#00a884]">●</span> <span>{userInfo.bio || "Bio not added"}</span></div>
              <div className="flex items-center gap-3"><span className="text-[#00a884]">●</span> <span>{userInfo.education || "Education not added"}</span></div>
              {userInfo.phone && (
                <div className="flex items-center gap-3"><span className="text-[#00a884]">📞</span> <span>{userInfo.phone}</span></div>
              )}
              {userInfo.email && (
                <div className="flex items-center gap-3"><span className="text-[#00a884]">✉️</span> <span>{userInfo.email}</span></div>
              )}
              <div className="flex items-center gap-3"><span className="text-[#00a884]">⚧</span> <span>{userInfo.gender || "Not specified"}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}