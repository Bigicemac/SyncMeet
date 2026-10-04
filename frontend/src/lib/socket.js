import { io } from "socket.io-client";
import { API } from "./api";

export const connectSocket = (token) => io(API, { auth: { token } });
