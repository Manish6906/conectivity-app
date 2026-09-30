import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import { connectSocket, disconnectSocket } from "../socket";

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export function AppProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [socket, setSocket] = useState(null);
  const [pending, setPending] = useState(0);

  const playNotificationSound = useCallback((frequency = 780) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const context = new AudioCtx();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.05;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      const start = context.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      oscillator.stop(start + 0.2);
      setTimeout(() => context.close(), 220);
    } catch {
      // Ignore browser audio restrictions.
    }
  }, []);

  const logout = useCallback(() => {
    if (socket) {
      socket.emit("user:logout");
    }
    localStorage.removeItem("token");
    localStorage.removeItem("rememberedLogin");
    disconnectSocket();
    setUser(null);
    setSocket(null);
    navigate("/login");
  }, [navigate, socket]);

  const refreshPending = useCallback(() => {
    api
      .get("/friends/received")
      .then((r) => {
        const next = r.data.requests.length;
        setPending((prev) => {
          if (next > prev && next > 0) playNotificationSound(640);
          return next;
        });
      })
      .catch(() => {});
  }, [playNotificationSound]);

  useEffect(() => {
    if (user && user.isDeactivated && location.pathname !== "/profile") {
      navigate("/profile", { replace: true });
    }
  }, [user, location.pathname, navigate]);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => {
        const s = connectSocket();
        s.on("friends:changed", refreshPending);
        s.on("connect_error", (e) => e.message === "unauthorized" && logout());
        setUser(res.data.user);
        setSocket(s);
        refreshPending();
      })
      .catch(() => logout());
    return () => disconnectSocket();
  }, [logout, refreshPending]);

  if (!user || !socket)
    return (
      <div className="h-dvh flex items-center justify-center text-gray-500 bg-slate-100">
        Loading...
      </div>
    );

  return (
    <AppCtx.Provider value={{ user, setUser, socket, pending, logout }}>
      {children}
    </AppCtx.Provider>
  );
}