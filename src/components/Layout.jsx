import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import {
  ArrowLeftRight,
  CheckCheck,
  LogOut,
  MessageSquareText,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useApp } from "../context/AppContext";

const links = [
  { to: "/users", icon: Users, label: "People" },
  { to: "/chats", icon: MessageSquareText, label: "Chats" },
  { to: "/requests", icon: CheckCheck, label: "Requests" },
  { to: "/rejected", icon: ShieldAlert, label: "Rejected" },
  { to: "/profile", icon: Settings, label: "Profile" },
];

export default function Layout() {
  const { pending, logout, user } = useApp();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const visibleLinks = user?.isDeactivated ? [{ to: "/profile", icon: Settings, label: "Profile" }] : links;

  return (
    <div className="h-dvh w-full flex flex-col-reverse md:flex-row bg-slate-100 overflow-hidden">
      <nav className="flex md:flex-col items-center justify-around md:justify-start md:gap-2 bg-[#111b21] text-gray-300 md:w-24 px-2 py-2 md:py-4">
        {visibleLinks.map((l) => {
          const Icon = l.icon;
          return (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl text-[11px] w-16 transition ${
                  isActive ? "bg-[#00a884] text-white shadow-lg" : "hover:bg-white/10"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {l.label}
              {l.to === "/requests" && pending > 0 && (
                <span className="absolute top-0.5 right-1 bg-red-500 text-white text-[10px] rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                  {pending}
                </span>
              )}
            </NavLink>
          );
        })}

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="md:mt-auto flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl text-[11px] w-16 hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </nav>

      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Logout</h3>
            <p className="mt-2 text-sm text-gray-600">Are you sure you want to logout?</p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}