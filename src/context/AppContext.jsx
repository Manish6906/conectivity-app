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

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("rememberedLogin");
    disconnectSocket();
    setUser(null);
    setSocket(null);
    navigate("/login");
  }, [navigate]);

  const refreshPending = useCallback(() => {
    api.get("/friends/received").then((r) => setPending(r.data.requests.length)).catch(() => {});
  }, []);

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