import { useEffect, useRef } from "react";
import { getPaymentSocket, PaymentSuccessEvent } from "@/lib/payment-socket";

interface UsePaymentSocketOptions {
  orderCode?: string;
  onPaymentSuccess?: (event: PaymentSuccessEvent) => void;
  enabled?: boolean;
}

export function usePaymentSocket({
  orderCode,
  onPaymentSuccess,
  enabled = true,
}: UsePaymentSocketOptions) {
  const onPaymentSuccessRef = useRef(onPaymentSuccess);
  onPaymentSuccessRef.current = onPaymentSuccess;

  useEffect(() => {
    if (!enabled || !orderCode || typeof window === "undefined") return;

    const socket = getPaymentSocket();
    if (!socket) return;

    // Join the order room
    socket.emit("subscribe_order", { orderCode });

    const handlePaymentSuccess = (event: PaymentSuccessEvent) => {
      const match =
        event.orderCode === orderCode ||
        (event.orderCode &&
          orderCode &&
          event.orderCode.replace(/\D/g, "") === orderCode.replace(/\D/g, ""));
      if (match) {
        onPaymentSuccessRef.current?.(event);
      }
    };

    const handleGlobalSepay = (event: PaymentSuccessEvent) => {
      const match =
        event.orderCode === orderCode ||
        (event.orderCode &&
          orderCode &&
          event.orderCode.replace(/\D/g, "") === orderCode.replace(/\D/g, ""));
      if (match) {
        onPaymentSuccessRef.current?.(event);
      }
    };

    socket.on("payment_success", handlePaymentSuccess);
    socket.on("sepay_payment_received", handleGlobalSepay);

    return () => {
      socket.emit("unsubscribe_order", { orderCode });
      socket.off("payment_success", handlePaymentSuccess);
      socket.off("sepay_payment_received", handleGlobalSepay);
    };
  }, [orderCode, enabled]);
}
