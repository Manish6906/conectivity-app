import { io } from "socket.io-client";

let socket = null;

const socketUrl = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

export const connectSocket = () => {
  if (socket) socket.disconnect();
  socket = io(socketUrl, {
    auth: { token: localStorage.getItem("token") },
  });
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};