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
  const { pending, logout } = useApp();

  return (
    <div className="h-dvh flex flex-col-reverse md:flex-row bg-slate-100">
      <nav className="flex md:flex-col items-center justify-around md:justify-start md:gap-2 bg-[#111b21] text-gray-300 md:w-24 px-2 py-2 md:py-4">
        <div className="hidden md:flex mb-3 flex-col items-center gap-1 text-center">
          <div className="h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white shadow-lg flex">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide text-[#d7fff5]">Connectivity</span>
        </div>

        {links.map((l) => {
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
          onClick={() => window.confirm("Are you sure you want to logout?") && logout()}
          className="md:mt-auto flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl text-[11px] w-16 hover:bg-red-500/20 hover:text-red-400 transition cursor-pointer"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </nav>

      <main className="flex-1 min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}