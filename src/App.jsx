import { Routes, Route, Navigate } from "react-router-dom";
import Register from "./components/Register";
import Login from "./components/Login";
import Layout from "./components/Layout";
import { AppProvider } from "./context/AppContext";
import Users from "./pages/Users";
import Chats from "./pages/Chats";
import Requests from "./pages/Requests";
import Rejected from "./pages/Rejected";
import Profile from "./pages/Profile";

const Private = ({ children }) =>
  localStorage.getItem("token") ? children : <Navigate to="/login" replace />;

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <Private>
            <AppProvider>
              <Layout />
            </AppProvider>
          </Private>
        }
      >
        <Route path="/" element={<Navigate to="/chats" replace />} />
        <Route path="/users" element={<Users />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/rejected" element={<Rejected />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}