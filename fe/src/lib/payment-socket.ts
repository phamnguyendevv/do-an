import { io, Socket } from "socket.io-client";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

let socket: Socket | null = null;

export function getPaymentSocket(): Socket {
  if (!socket && typeof window !== "undefined") {
    socket = io(API_BASE, {
      transports: ["websocket", "polling"],
      autoConnect: true,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket as Socket;
}

export interface PaymentSuccessEvent {
  orderCode: string;
  orderId?: number;
  amount: number;
  paymentStatus: string;
  transactionDate?: string;
  gateway?: string;
}
