import { io } from "socket.io-client";

let socket = null;

export const connectSocket = () => {
  if (socket) socket.disconnect();
  socket = io("http://localhost:5000", {
    auth: { token: localStorage.getItem("token") },
  });
  return socket;
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
};