import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Banknote,
  BookOpen,
  Check,
  ChevronRight,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceiptK80 } from "@/components/pos/receipt-k80";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { usePaymentSocket } from "@/hooks/use-payment-socket";
import { useBooks, useCategories } from "@/hooks/use-store";
import { useCustomerLookup } from "@/hooks/use-customer-lookup";
import { defineAbilityFor } from "@/lib/ability";

import { orderApi, sepayApi } from "@/lib/order-api";
import { orderService } from "@/services/order-service";
import { storeSettingsService } from "@/services/store-settings";
import { formatCurrency, formatNumber } from "@/utils/format";
import type { Book } from "@/types";

// Normalize phone: remove non-digits, convert 84xxx to 0xxx
const normalizePhone = (phone: string): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("84") ? `0${digits.slice(2)}` : digits;
};

export const Route = createFileRoute("/pos")({
  head: () => ({
    meta: [
      { title: "Bán tại quầy (POS) — BookStock" },
      { name: "description", content: "Màn hình bán lẻ tại quầy POS, thanh toán SePay QR và in hóa đơn K80." },
    ],
  }),
  component: PosPage,
});

interface CartItem {
  book: Book;
  quantity: number;
  price: number;
}

// Helper to reliably get a book's selling price
const getBookSellingPrice = (b: Book): number => {
  const price = b.sellingPrice ?? (b as any).price ?? 0;
  return Number(price) || 0;
};

export function PosPage() {
  const navigate = useNavigate();
  const { user, hydrated } = useAuth();
  const ability = useMemo(() => defineAbilityFor(user), [user]);
  const books = useBooks();
  const categories = useCategories();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (hydrated && !user) {
      navigate({ to: "/login", replace: true });
    } else if (hydrated && user && !ability.can("create", "BookstoreOrder")) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [hydrated, user, ability, navigate]);

  // State
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Customer lookup with suggestions
  const {
    customerName,
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    suggestions: customerSuggestions,
    isLoading: isLoadingCustomer,
    showSuggestions: showPhoneSuggestions,
    setShowSuggestions: setShowPhoneSuggestions,
    handleSelectCustomer,
  } = useCustomerLookup();

  // Mobile navigation state: "products" (chọn sách) | "cart" (giỏ hàng & thanh toán)
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  // Lazy render count for high performance on mobile devices
  const [visibleCount, setVisibleCount] = useState(36);

  // Reset lazy load limit on search / filter change
  useEffect(() => {
    setVisibleCount(36);
  }, [search, selectedCategory]);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "SEPAY" | "CARD">("CASH");
  const [receivedCash, setReceivedCash] = useState<number | "">("");
  const [sepayConfirmed, setSepayConfirmed] = useState(false);
  const [sepayOrderCreated, setSepayOrderCreated] = useState(false);
  const [isCreatingSepayOrder, setIsCreatingSepayOrder] = useState(false);
  const [sepayCreatedOrderId, setSepayCreatedOrderId] = useState<number | string | null>(null);

  // Success / Print dialog
  const [successOrder, setSuccessOrder] = useState<any | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSuccessPopup, setPaymentSuccessPopup] = useState<{
    open: boolean;
    amount: number;
    orderCode: string;
    orderData?: any;
  } | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Order code for current transaction & SePay VietQR (use DH- prefix to match SePay webhook filter)
  const [posOrderCode, setPosOrderCode] = useState<string>(() => `DH-${Date.now().toString().slice(-6)}`);
  const [isPollingSepay, setIsPollingSepay] = useState(false);
  const currentOrderCode = posOrderCode;

  // Filtered books (using deferredSearch for 60fps responsiveness during typing)
  const filteredBooks = useMemo(() => {
    const q = deferredSearch.trim().toLowerCase();
    const targetCategory = (selectedCategory || "all").trim().toLowerCase();

    return books.filter((b) => {
      const matchSearch =
        !q ||
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.isbn && b.isbn.toLowerCase().includes(q)) ||
        String(b.id).includes(q);

      const bookCat = String(b.category || "").trim().toLowerCase();
      const matchCategory =
        targetCategory === "all" ||
        bookCat === targetCategory ||
        String((b as any).categoryId || "").toLowerCase() === targetCategory;

      return matchSearch && matchCategory;
    });
  }, [books, deferredSearch, selectedCategory]);

  const displayedBooks = useMemo(() => {
    return filteredBooks.slice(0, visibleCount);
  }, [filteredBooks, visibleCount]);

  // Cart Calculations
  const totalCartItems = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [cart],
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [cart],
  );

  const total = useMemo(
    () => Math.max(0, subtotal - discountAmount),
    [subtotal, discountAmount],
  );

  const changeCash = useMemo(() => {
    if (typeof receivedCash !== "number") return 0;
    return Math.max(0, receivedCash - total);
  }, [receivedCash, total]);

  // Tiền mặt chưa nhập hoặc nhập ít hơn tổng cộng -> Không cho phép thanh toán
  const isCashInsufficient =
    paymentMethod === "CASH" &&
    total > 0 &&
    (typeof receivedCash !== "number" || isNaN(receivedCash) || receivedCash < total);

  // Add to cart
  const addToCart = (book: Book) => {
    if (book.stock <= 0) {
      toast.error(`"${book.title}" đã hết hàng trong kho!`);
      return;
    }

    const unitPrice = getBookSellingPrice(book);

    setCart((prev) => {
      const existing = prev.find((item) => String(item.book.id) === String(book.id));
      if (existing) {
        if (existing.quantity >= book.stock) {
          toast.warning(`Kho chỉ còn ${book.stock} cuốn "${book.title}".`);
          return prev;
        }
        return prev.map((item) =>
          String(item.book.id) === String(book.id)
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [{ book, quantity: 1, price: unitPrice }, ...prev];
    });
  };

  // Update item quantity
  const updateQuantity = (bookId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (String(item.book.id) === String(bookId)) {
            const nextQty = item.quantity + delta;
            if (nextQty <= 0) return null;
            if (nextQty > item.book.stock) {
              toast.warning(`Kho chỉ còn ${item.book.stock} cuốn.`);
              return item;
            }
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[],
    );
  };

  // Update item price
  const updateItemPrice = (bookId: string, newPrice: number) => {
    setCart((prev) =>
      prev.map((item) =>
        String(item.book.id) === String(bookId)
          ? { ...item, price: Math.max(0, newPrice) }
          : item,
      ),
    );
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setReceivedCash("");
    setSepayConfirmed(false);
    setSepayOrderCreated(false);
    setSepayCreatedOrderId(null);
    setIsCreatingSepayOrder(false);
    setPaymentMethod("CASH");
    setCustomerName("Khách lẻ");
    setCustomerPhone("");
    setPosOrderCode(`DH-${Date.now().toString().slice(-6)}`);
    setMobileTab("products");
  };

  // Hotkeys: F2 (search), F4 (checkout), F9 (new sale)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "F4") {
        e.preventDefault();
        if (cart.length > 0) {
          if (isCashInsufficient) {
            toast.warning(
              typeof receivedCash !== "number"
                ? "Vui lòng nhập tiền khách đưa trước khi thanh toán!"
                : `Khách đưa thiếu ${formatCurrency(total - receivedCash)}!`,
            );
          } else {
            handleCheckout();
          }
        }
      } else if (e.key === "F9") {
        e.preventDefault();
        clearCart();
        toast.info("Đã làm mới giỏ hàng");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cart, total, paymentMethod, receivedCash, isCashInsufficient, sepayConfirmed]);

  // SePay QR Url (Dynamic from store settings / .env)
  const sepayConfig = useMemo(() => storeSettingsService.getSepayConfig(), [paymentMethod]);
  const sepayBank = sepayConfig.bank;
  const sepayAccount = sepayConfig.accountNumber;
  const sepayAccountName = sepayConfig.accountName;
  const sepayQrUrl = storeSettingsService.getSepayQrUrl(total, posOrderCode);

  // Tạo đơn hàng ngay khi chọn SEPAY để SePay webhook có thể tìm thấy
  useEffect(() => {
    if (paymentMethod !== "SEPAY" || total <= 0 || cart.length === 0 || sepayOrderCreated || isCreatingSepayOrder) {
      return;
    }

    const createSepayOrder = async () => {
      setIsCreatingSepayOrder(true);
      try {
        const res = await orderService.createOrder({
          orderCode: posOrderCode,
          customerName: customerName || "Khách lẻ tại quầy",
          customerPhone: normalizePhone(customerPhone) || "0900000000",
          customerAddress: "Bán trực tiếp tại quầy POS",
          shippingMethod: "Bán tại quầy (POS)",
          shippingFee: 0,
          discount: discountAmount,
          note: `Bán lẻ POS • Chờ thanh toán SePay QR`,
          status: "PENDING",
          payment: "UNPAID",
          lines: cart.map((item) => ({
            bookId: item.book.id,
            quantity: item.quantity,
            price: Number(item.price) || 0,
          })),
        });
        if (res.ok && res.data) {
          setSepayOrderCreated(true);
          setSepayCreatedOrderId(res.data.id ?? null);
        }
      } catch (err: any) {
        console.error("Lỗi tạo đơn SePay:", err);
      } finally {
        setIsCreatingSepayOrder(false);
      }
    };

    createSepayOrder();
  }, [paymentMethod, total, cart.length, posOrderCode, sepayOrderCreated, isCreatingSepayOrder]);

  // Real-time WebSocket listener khi chờ SePay chuyển khoản (thay thế polling)
  usePaymentSocket({
    orderCode: posOrderCode,
    enabled: paymentMethod === "SEPAY" && total > 0 && cart.length > 0 && !sepayConfirmed,
    onPaymentSuccess: (event) => {
      setSepayConfirmed(true);
      const confirmedTotal = event.amount || total;

      const orderData = {
        id: sepayCreatedOrderId || posOrderCode,
        orderCode: posOrderCode,
        customerName: customerName || "Khách lẻ tại quầy",
        customerPhone: customerPhone || "0900000000",
        status: "DELIVERED",
        payment: "PAID",
        items: cart.map((i) => ({
          bookId: i.book.id,
          title: i.book.title,
          quantity: i.quantity,
          price: Number(i.price) || 0,
        })),
        subtotal,
        discount: discountAmount,
        total: confirmedTotal,
        receivedAmount: confirmedTotal,
        changeAmount: 0,
        paymentMethod: "Chuyển khoản SePay QR",
        cashierName: user?.name || user?.email || "Thu ngân BookStock",
        createdAt: new Date().toISOString(),
        qrUrl: storeSettingsService.getSepayQrUrl(total, posOrderCode),
      };

      setPaymentSuccessPopup({
        open: true,
        amount: confirmedTotal,
        orderCode: posOrderCode,
        orderData,
      });

      // Refresh customer stats & orders query
      queryClient.invalidateQueries({ queryKey: ["customers"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["customer-orders"], refetchType: "all" });

      if (sepayCreatedOrderId) {
        orderApi.updateStatus(sepayCreatedOrderId, "DELIVERED").catch(() => {});
        orderApi.updatePayment(sepayCreatedOrderId, "PAID").catch(() => {});
      } else {
        orderService
          .createOrder({
            orderCode: posOrderCode,
            customerName: customerName || "Khách lẻ tại quầy",
            customerPhone: normalizePhone(customerPhone) || "0900000000",
            customerAddress: "Bán trực tiếp tại quầy POS (SePay QR)",
            shippingMethod: "Bán tại quầy (POS)",
            shippingFee: 0,
            discount: discountAmount,
            note: `Bán lẻ POS • Chuyển khoản SePay QR (Real-time WebSocket)`,
            status: "DELIVERED",
            payment: "PAID",
            lines: cart.map((item) => ({
              bookId: item.book.id,
              quantity: item.quantity,
              price: Number(item.price) || 0,
            })),
          })
          .catch(() => {});
      }
    },
  });


  // Đóng Popup thành công & hoàn tất in bill (dùng cho cả click tay và tự đóng sau 2s)
  const handleDismissSuccessPopup = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (paymentSuccessPopup?.orderData) {
      const order = paymentSuccessPopup.orderData;
      setPaymentSuccessPopup(null);
      setSuccessOrder(order);
      setPrintDialogOpen(true);
      clearCart();
      setTimeout(() => {
        window.print();
      }, 300);
    } else {
      setPaymentSuccessPopup(null);
    }
  };

  // Xác nhận thanh toán SePay thủ công (tối ưu hóa luồng)
  const handleManualSepayConfirm = async () => {
    if (cart.length === 0 || total <= 0) return;

    if (sepayCreatedOrderId) {
      await orderApi.updateStatus(sepayCreatedOrderId, "DELIVERED").catch(() => {});
      await orderApi.updatePayment(sepayCreatedOrderId, "PAID").catch(() => {});
    } else {
      await orderService
        .createOrder({
          orderCode: posOrderCode,
          customerName: customerName || "Khách lẻ tại quầy",
          customerPhone: normalizePhone(customerPhone) || "0900000000",
          customerAddress: "Bán trực tiếp tại quầy POS (SePay QR)",
          shippingMethod: "Bán tại quầy (POS)",
          shippingFee: 0,
          discount: discountAmount,
          note: `Bán lẻ POS • Xác nhận SePay QR thủ công`,
          status: "DELIVERED",
          payment: "PAID",
          lines: cart.map((item) => ({
            bookId: item.book.id,
            quantity: item.quantity,
            price: Number(item.price) || 0,
          })),
        })
        .catch(() => {});
    }

    const orderData = {
      id: sepayCreatedOrderId || posOrderCode,
      orderCode: posOrderCode,
      customerName: customerName || "Khách lẻ tại quầy",
      customerPhone: customerPhone || "0900000000",
      status: "DELIVERED",
      payment: "PAID",
      items: cart.map((i) => ({
        bookId: i.book.id,
        title: i.book.title,
        quantity: i.quantity,
        price: Number(i.price) || 0,
      })),
      subtotal,
      discount: discountAmount,
      total,
      receivedAmount: total,
      changeAmount: 0,
      paymentMethod: "Chuyển khoản SePay QR",
      cashierName: user?.name || user?.email || "Thu ngân BookStock",
      createdAt: new Date().toISOString(),
      qrUrl: storeSettingsService.getSepayQrUrl(total, posOrderCode),
    };

    setSepayConfirmed(true);
    setPaymentSuccessPopup({
      open: true,
      amount: total,
      orderCode: posOrderCode,
      orderData,
    });

    // Refresh customer stats & orders query
    queryClient.invalidateQueries({ queryKey: ["customers"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["customer-orders"], refetchType: "all" });
    toast.success("✅ Đã xác nhận thanh toán SePay thành công!");
  };

  // Tự động đóng Popup sau đúng 2 giây (độc lập, chạy chuẩn xác 100%)
  useEffect(() => {
    if (!paymentSuccessPopup?.open) return;

    autoCloseTimerRef.current = setTimeout(() => {
      handleDismissSuccessPopup();
    }, 2000);

    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
    };
  }, [paymentSuccessPopup]);

  // Checkout execution
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error("Giỏ hàng đang trống!");
      return;
    }

    if (!customerPhone.trim()) {
      toast.error("Vui lòng nhập số điện thoại khách hàng");
      return;
    }

    if (customerPhone.replace(/\D/g, "").length < 8) {
      toast.error("Số điện thoại không hợp lệ (tối thiểu 8 ký tự)");
      return;
    }

    if (paymentMethod === "CASH" && total > 0 && (typeof receivedCash !== "number" || receivedCash < total)) {
      toast.error(
        typeof receivedCash !== "number"
          ? "Vui lòng nhập số tiền khách đưa!"
          : `Số tiền khách đưa còn thiếu ${formatCurrency(total - receivedCash)}!`,
      );
      return;
    }

    setIsSubmitting(true);
    try {
      let orderId: number | string | null = null;
      let orderCode = currentOrderCode;

      // Nếu là SEPAY và đơn đã được tạo trước → chỉ cập nhật trạng thái
      if (paymentMethod === "SEPAY" && sepayOrderCreated && sepayCreatedOrderId) {
        orderId = sepayCreatedOrderId;
        // Gọi thẳng orderApi để cập nhật trạng thái (bypass local transition validation)
        await orderApi.updateStatus(orderId, "DELIVERED").catch(() => {});
        await orderApi.updatePayment(orderId, "PAID").catch(() => {});

        const orderData = {
          id: orderId,
          orderCode,
          customerName: customerName || "Khách lẻ tại quầy",
          customerPhone: customerPhone || "0900000000",
          status: "DELIVERED",
          payment: "PAID",
          items: cart.map((i) => ({
            bookId: i.book.id,
            title: i.book.title,
            quantity: i.quantity,
            price: Number(i.price) || 0,
          })),
          subtotal,
          discount: discountAmount,
          total,
          receivedAmount: total,
          changeAmount: 0,
          paymentMethod: "Chuyển khoản SePay QR",
          cashierName: user?.name || user?.email || "Thu ngân BookStock",
          createdAt: new Date().toISOString(),
          qrUrl: sepayQrUrl,
        };

        setSuccessOrder(orderData);
        setPrintDialogOpen(true);
        clearCart();
        toast.success(`Đã xác nhận thanh toán SePay thành công đơn ${orderCode}!`);
        return;
      }

      // Tạo đơn mới cho CASH / CARD
      const res = await orderService.createOrder({
        orderCode: posOrderCode,
        customerName: customerName || "Khách lẻ tại quầy",
        customerPhone: normalizePhone(customerPhone) || "0900000000",
        customerAddress: "Bán trực tiếp tại quầy POS",
        shippingMethod: "Bán tại quầy (POS)",
        shippingFee: 0,
        discount: discountAmount,
        note: `Bán lẻ POS • Phương thức: ${
          paymentMethod === "CASH" ? "Tiền mặt" : "Thẻ POS"
        }`,
        status: "DELIVERED",
        payment: "PAID",
        lines: cart.map((item) => ({
          bookId: item.book.id,
          quantity: item.quantity,
          price: Number(item.price) || 0,
        })),
      });

      if (res.ok && res.data) {
        const orderData = {
          ...res.data,
          status: "DELIVERED",
          payment: "PAID",
          orderCode: res.data.orderCode || res.data.id || currentOrderCode,
          items: cart.map((i) => ({
            bookId: i.book.id,
            title: i.book.title,
            quantity: i.quantity,
            price: Number(i.price) || 0,
          })),
          subtotal,
          discount: discountAmount,
          total,
          receivedAmount: typeof receivedCash === "number" ? receivedCash : total,
          changeAmount: paymentMethod === "CASH" ? changeCash : 0,
          paymentMethod: paymentMethod === "CASH" ? "Tiền mặt" : "Thẻ POS",
          cashierName: user?.name || user?.email || "Thu ngân BookStock",
          createdAt: new Date().toISOString(),
        };

        if (res.data.id) {
          orderService.updatePayment(res.data.id, "PAID").catch(() => {});
        }

        // Refresh customer stats & orders query
        queryClient.invalidateQueries({ queryKey: ["customers"], refetchType: "all" });
        queryClient.invalidateQueries({ queryKey: ["customer-orders"], refetchType: "all" });

        setSuccessOrder(orderData);
        setPrintDialogOpen(true);
        clearCart();
        toast.success(`Đã thanh toán thành công đơn hàng ${orderData.orderCode}!`);
      } else {
        toast.error(res.error || "Không thể tạo đơn hàng POS");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi xử lý thanh toán");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Tự động đóng bill & tạo đơn hàng mới ngay khi in bill xong (hoặc đóng cửa sổ in)
  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintDialogOpen(false);
      setSuccessOrder(null);
      clearCart();
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      toast.info("✨ Sẵn sàng cho đơn hàng mới! (F2)");
    };

    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground overflow-hidden">
      {/* POS Top Bar - Compact & Responsive */}
      <header className="flex h-13 sm:h-14 shrink-0 items-center justify-between border-b px-2.5 sm:px-4 bg-card z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Button variant="ghost" size="sm" asChild className="px-2 sm:px-3 h-8 sm:h-9">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Thoát POS</span>
            </Link>
          </Button>
          <div className="hidden sm:block h-4 w-px bg-border" />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground font-bold text-[10px] sm:text-xs shadow-sm">
              POS
            </span>
            <span className="font-semibold text-xs sm:text-sm truncate">
              Bán lẻ tại quầy <span className="hidden sm:inline">— BookStock</span>
            </span>
          </div>
        </div>

        {/* Hotkey Badges (Desktop Only) */}
        <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="font-mono text-[11px] bg-muted/50">
            F2: Tìm kiếm
          </Badge>
          <Badge variant="outline" className="font-mono text-[11px] bg-muted/50">
            F4: Thanh toán
          </Badge>
          <Badge variant="outline" className="font-mono text-[11px] bg-muted/50">
            F9: Đơn mới
          </Badge>
        </div>

        {/* Cashier, Theme toggle & Order link */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <span className="text-xs text-muted-foreground mr-1 hidden lg:inline">
            Thu ngân: <strong className="text-foreground">{user?.name || user?.email || "Admin"}</strong>
          </span>
          <ThemeToggle />
          <Button variant="outline" size="sm" className="hidden sm:inline-flex h-8 sm:h-9 text-xs" asChild>
            <Link to="/orders">Lịch sử đơn</Link>
          </Button>
        </div>
      </header>

      {/* Main Responsive Body: 2 columns on desktop, 1 column with bottom navigation on mobile */}
      <div className="flex flex-1 overflow-hidden relative pb-14 md:pb-0">
        {/* Left Column: Product Selection (Visible on desktop OR when mobileTab === 'products') */}
        <div
          className={`flex flex-1 flex-col border-r bg-muted/20 overflow-hidden ${
            mobileTab === "products" ? "flex w-full" : "hidden md:flex"
          }`}
        >
          {/* Search & Category Filter */}
          <div className="p-2.5 sm:p-3 border-b bg-card space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm tên sách, tác giả, ISBN, barcode... (F2)"
                className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-background"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground p-0.5 rounded"
                  aria-label="Xóa tìm kiếm"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Category Pills (Touch friendly horizontal scroll) */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar scroll-smooth">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full px-3 shrink-0 active:scale-95 transition-transform"
                onClick={() => setSelectedCategory("all")}
              >
                Tất cả ({books.length})
              </Button>
              {categories.map((c) => {
                const catName = String(c?.name || c?.id || "").trim();
                if (!catName) return null;
                const isSelected =
                  selectedCategory.toLowerCase() === catName.toLowerCase() ||
                  (c.id && selectedCategory.toLowerCase() === String(c.id).toLowerCase());

                return (
                  <Button
                    key={c.id || catName}
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs rounded-full px-3 whitespace-nowrap shrink-0 active:scale-95 transition-transform"
                    onClick={() => setSelectedCategory(catName)}
                  >
                    {catName}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Book Cards Grid - High performance lazy rendered */}
          <div className="flex-1 overflow-y-auto p-2.5 sm:p-3">
            {filteredBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground text-center px-4">
                <Search className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">Không tìm thấy đầu sách nào phù hợp.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-2.5 pb-16 md:pb-4">
                {displayedBooks.map((b) => {
                  const isOutOfStock = b.stock <= 0;
                  const isLowStock = b.stock > 0 && b.stock <= (b.minStock || 10);
                  const inCartItem = cart.find((it) => String(it.book.id) === String(b.id));
                  const bookPrice = getBookSellingPrice(b);

                  return (
                    <div
                      key={b.id}
                      onClick={() => !isOutOfStock && addToCart(b)}
                      className={`relative flex flex-col justify-between rounded-xl border p-2.5 sm:p-3 transition-all cursor-pointer select-none bg-card hover:border-primary hover:shadow-xs active:scale-[0.97] touch-manipulation ${
                        isOutOfStock ? "opacity-45 cursor-not-allowed bg-muted" : ""
                      }`}
                    >
                      {inCartItem && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-[10px] shadow">
                          {inCartItem.quantity}
                        </span>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] sm:text-[11px] gap-1">
                          <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-normal truncate max-w-[75px] sm:max-w-[100px]">
                            {b.category}
                          </Badge>
                          <span
                            className={`font-semibold text-[10px] sm:text-[11px] shrink-0 ${
                              isOutOfStock
                                ? "text-destructive"
                                : isLowStock
                                  ? "text-amber-500"
                                  : "text-emerald-600 dark:text-emerald-400"
                            }`}
                          >
                            {isOutOfStock ? "Hết" : `Tồn: ${b.stock}`}
                          </span>
                        </div>

                        <h3 className="font-semibold text-xs leading-snug line-clamp-2 pt-0.5" title={b.title}>
                          {b.title}
                        </h3>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{b.author}</p>
                      </div>

                      <div className="mt-2 pt-2 border-t flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-primary tabular-nums">
                          {formatCurrency(bookPrice)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 sm:h-6 sm:w-6 rounded-full bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary transition-colors active:scale-90"
                          disabled={isOutOfStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOutOfStock) addToCart(b);
                          }}
                          aria-label={`Thêm ${b.title} vào giỏ`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}

                {/* Lazy load more indicator */}
                {filteredBooks.length > visibleCount && (
                  <div className="col-span-full py-4 flex flex-col items-center justify-center gap-1.5">
                    <p className="text-xs text-muted-foreground">
                      Đang hiển thị {displayedBooks.length} / {filteredBooks.length} sản phẩm
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full px-5 h-8 text-xs font-semibold shadow-xs hover:bg-accent active:scale-95"
                      onClick={() => setVisibleCount((prev) => prev + 36)}
                    >
                      Xem thêm ({Math.min(36, filteredBooks.length - visibleCount)} sách)
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Floating Cart Quick Banner on Mobile (when in Products view & cart has items) */}
          {mobileTab === "products" && cart.length > 0 && (
            <div className="md:hidden fixed bottom-16 left-3 right-3 z-30 animate-in slide-in-from-bottom-3 duration-200">
              <div
                onClick={() => setMobileTab("cart")}
                className="flex items-center justify-between p-3 rounded-xl bg-primary text-primary-foreground shadow-xl shadow-primary/25 cursor-pointer active:scale-[0.98] transition-transform"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 font-bold text-xs">
                    {totalCartItems}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold truncate leading-tight">
                      Giỏ hàng ({totalCartItems} cuốn)
                    </span>
                    <span className="text-xs opacity-90 font-bold tabular-nums leading-tight">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg shrink-0">
                  <span>Thanh toán</span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Cart & Payment (Visible on desktop OR when mobileTab === 'cart') */}
        <div
          className={`flex flex-col bg-card border-l overflow-hidden ${
            mobileTab === "cart" ? "flex flex-1 w-full" : "hidden md:flex md:w-80 lg:w-96 shrink-0"
          }`}
        >
          {/* Cart Header */}
          <div className="p-2.5 sm:p-3 border-b flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-7 w-7 -ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => setMobileTab("products")}
                title="Quay lại chọn sách"
                aria-label="Quay lại chọn sách"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">
                Giỏ hàng ({totalCartItems} cuốn)
              </span>
            </div>
            {cart.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={clearCart}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" /> Xóa tất cả
              </Button>
            )}
          </div>

          {/* Customer Info with Suggestions */}
          <div className="p-2.5 border-b bg-muted/10 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Tên khách hàng"
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="relative">
                <Input
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setShowPhoneSuggestions(true);
                  }}
                  onFocus={() => customerPhone.trim().length >= 8 && setShowPhoneSuggestions(true)}
                  placeholder="SĐT (bắt buộc)"
                  className="h-8 text-xs bg-background border-red-200"
                  required
                />
                {isLoadingCustomer && (
                  <Loader2 className="absolute right-2 top-1.5 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>
            {showPhoneSuggestions && customerSuggestions.length > 0 && (
              <div className="border rounded-md bg-background shadow-lg max-h-32 overflow-y-auto z-50">
                {customerSuggestions.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-muted text-xs border-b last:border-b-0 active:bg-primary/20 transition-colors"
                  >
                    <div className="font-medium">{customer.name}</div>
                    <div className="text-muted-foreground text-[11px]">{customer.phone}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-2.5 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center px-4">
                <ShoppingCart className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">Giỏ hàng đang trống</p>
                <p className="text-xs text-muted-foreground mt-0.5 max-w-xs">
                  Nhấn vào sách ở danh sách để thêm vào đơn hàng.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 md:hidden text-xs rounded-full h-8 px-4"
                  onClick={() => setMobileTab("products")}
                >
                  <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Chọn sách ngay
                </Button>
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.book.id}
                  className="flex items-center justify-between gap-2 p-2.5 sm:p-2 rounded-lg border bg-background text-xs shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-xs truncate" title={item.book.title}>
                      {item.book.title}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatCurrency(item.price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 sm:h-6 sm:w-6 active:scale-95 touch-manipulation"
                      onClick={() => updateQuantity(item.book.id, -1)}
                      aria-label="Giảm số lượng"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-bold text-xs">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-7 w-7 sm:h-6 sm:w-6 active:scale-95 touch-manipulation"
                      onClick={() => updateQuantity(item.book.id, 1)}
                      aria-label="Tăng số lượng"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="text-right shrink-0 w-18 sm:w-16">
                    <span className="font-bold text-xs sm:text-[12px] tabular-nums">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Checkout & Payment Box */}
          <div className="border-t p-2.5 sm:p-3 bg-muted/20 space-y-2.5 sm:space-y-3">
            {/* Calculation summary */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Tạm tính:</span>
                <span className="tabular-nums font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Chiết khấu (VNĐ):</span>
                <Input
                  type="number"
                  min="0"
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="h-7 w-28 text-right text-xs bg-background"
                />
              </div>
              <div className="flex justify-between items-baseline border-t pt-1.5">
                <span className="font-bold text-sm">TỔNG CỘNG:</span>
                <span className="font-bold text-lg text-primary tabular-nums">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <Tabs value={paymentMethod} onValueChange={(v: any) => setPaymentMethod(v)}>
              <TabsList className="grid grid-cols-3 h-8 sm:h-8 w-full">
                <TabsTrigger value="CASH" className="text-[11px] sm:text-xs gap-1">
                  <Banknote className="h-3.5 w-3.5" /> Tiền mặt
                </TabsTrigger>
                <TabsTrigger value="SEPAY" className="text-[11px] sm:text-xs gap-1">
                  <QrCode className="h-3.5 w-3.5" /> SePay QR
                </TabsTrigger>
                <TabsTrigger value="CARD" className="text-[11px] sm:text-xs gap-1">
                  <CreditCard className="h-3.5 w-3.5" /> Thẻ POS
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Payment Method Content */}
            {paymentMethod === "CASH" && (
              <div className="space-y-2 pt-0.5">
                {/* Quick cash denomination chips */}
                <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-1">
                  {[total, 50000, 100000, 200000, 500000, 1000000]
                    .filter((val, i, arr) => val > 0 && arr.indexOf(val) === i)
                    .slice(0, 6)
                    .map((val) => (
                      <Button
                        key={val}
                        variant={receivedCash === val ? "default" : "outline"}
                        size="sm"
                        className="h-7 sm:h-6 text-[11px] px-2 active:scale-95 font-medium"
                        onClick={() => setReceivedCash(val)}
                      >
                        {val === total ? "Đủ tiền" : formatNumber(val)}
                      </Button>
                    ))}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={receivedCash}
                    onChange={(e) =>
                      setReceivedCash(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    placeholder="Nhập tiền khách đưa..."
                    className="h-8 text-xs font-semibold bg-background"
                  />
                </div>

                {receivedCash === "" || typeof receivedCash !== "number" ? (
                  <div className="flex justify-between items-center text-xs p-1.5 rounded bg-muted/60 text-muted-foreground">
                    <span>Cần thu từ khách:</span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatCurrency(total)}
                    </span>
                  </div>
                ) : (
                  <div
                    className={`flex justify-between items-center text-xs p-1.5 rounded ${
                      isCashInsufficient
                        ? "bg-destructive/10 text-destructive font-semibold"
                        : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                    }`}
                  >
                    <span>{isCashInsufficient ? "Khách đưa thiếu:" : "Tiền thối lại:"}</span>
                    <span className="font-bold tabular-nums">
                      {isCashInsufficient
                        ? formatCurrency(total - receivedCash)
                        : formatCurrency(changeCash)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === "SEPAY" && (
              cart.length === 0 || total <= 0 ? (
                <div className="p-4 text-center text-xs text-muted-foreground border rounded-lg bg-background space-y-1">
                  <QrCode className="h-7 w-7 mx-auto mb-1 opacity-40 text-primary" />
                  <p className="font-semibold text-foreground">Chưa có sản phẩm trong giỏ</p>
                  <p className="text-[11px] text-muted-foreground">
                    Vui lòng thêm sách vào đơn hàng (F2) để tạo mã VietQR SePay.
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border bg-background space-y-2 text-center">
                  {/* Trạng thái tạo đơn */}
                  {isCreatingSepayOrder && (
                    <p className="text-[10px] text-amber-600 flex items-center justify-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Đang tạo đơn hàng...
                    </p>
                  )}

                  <div className="flex justify-center relative">
                    <img
                      src={sepayQrUrl}
                      alt="SePay VietQR"
                      className="w-36 h-36 sm:w-40 sm:h-40 object-contain rounded-lg border p-1 bg-white shadow-sm"
                    />
                    {isCreatingSepayOrder && (
                      <div className="absolute inset-0 bg-background/80 rounded-lg border flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      </div>
                    )}
                    {sepayConfirmed && (
                      <div className="absolute inset-0 bg-emerald-600/90 rounded-lg border flex flex-col items-center justify-center text-white text-xs font-bold gap-1 animate-in fade-in zoom-in-95">
                        <Check className="h-8 w-8 text-white stroke-[3]" />
                        ĐÃ NHẬN TIỀN
                      </div>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p>
                      Ngân hàng: <strong>{sepayBank}</strong> • STK: <strong>{sepayAccount}</strong>
                    </p>
                    <p>
                      Chủ TK: <strong className="text-foreground">{sepayAccountName}</strong>
                    </p>
                    <p>
                      Cú pháp CK: <strong className="text-primary font-mono font-bold text-xs">{posOrderCode}</strong>
                    </p>
                    <div className="pt-0.5">
                      {sepayConfirmed ? (
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center justify-center gap-1">
                          <Check className="h-3 w-3" /> SePay đã xác nhận thanh toán!
                        </p>
                      ) : sepayOrderCreated ? (
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Đang lắng nghe thanh toán...
                        </p>
                      ) : (
                        <p className="text-[10px] text-amber-600 font-medium flex items-center justify-center gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" /> Đang chuẩn bị đơn hàng...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 pt-1">
                    <Button
                      size="sm"
                      variant={sepayConfirmed ? "default" : "outline"}
                      className="flex-1 h-7 text-xs active:scale-95"
                      disabled={!sepayOrderCreated}
                      onClick={handleManualSepayConfirm}
                    >
                      <Check className="mr-1 h-3.5 w-3.5" />
                      {sepayConfirmed ? "Đã nhận tiền" : "Xác nhận thủ công"}
                    </Button>
                    <Link to="/settings" target="_blank">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground" title="Đổi tài khoản ngân hàng">
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            )}

            {paymentMethod === "CARD" && (
              <div className="p-2.5 rounded-lg border bg-background text-center text-xs text-muted-foreground space-y-1">
                <CreditCard className="h-6 w-6 mx-auto text-primary opacity-80" />
                <p className="font-semibold text-foreground">Thanh toán qua máy POS quẹt thẻ</p>
                <p className="text-[11px]">Vui lòng quẹt thẻ trên thiết bị POS của ngân hàng.</p>
              </div>
            )}

            {/* Pay Button */}
            <Button
              className={`w-full h-11 text-sm font-bold shadow-md gap-2 rounded-xl active:scale-[0.99] ${
                isCashInsufficient ? "opacity-60 cursor-not-allowed" : ""
              }`}
              onClick={handleCheckout}
              disabled={cart.length === 0 || isSubmitting || isCashInsufficient || !customerPhone.trim()}
            >
              <Printer className="h-4 w-4" />
              {isSubmitting
                ? "Đang xử lý..."
                : paymentMethod === "CASH" && isCashInsufficient
                  ? typeof receivedCash !== "number"
                    ? "Chưa nhập tiền khách đưa"
                    : `Khách đưa thiếu ${formatCurrency(total - receivedCash)}`
                  : `Thanh toán & In Bill K80 (F4)`}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-card/95 backdrop-blur border-t z-40 grid grid-cols-2 px-2 py-1 items-center shadow-lg">
        <button
          type="button"
          onClick={() => setMobileTab("products")}
          className={`flex flex-col items-center justify-center h-full rounded-lg text-xs transition-all ${
            mobileTab === "products"
              ? "text-primary font-bold bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="h-4 w-4 mb-0.5" />
          <span>Chọn sách</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab("cart")}
          className={`relative flex flex-col items-center justify-center h-full rounded-lg text-xs transition-all ${
            mobileTab === "cart"
              ? "text-primary font-bold bg-primary/10"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <div className="relative">
            <ShoppingCart className="h-4 w-4 mb-0.5" />
            {totalCartItems > 0 && (
              <span className="absolute -top-1.5 -right-3 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-[10px] shadow">
                {totalCartItems}
              </span>
            )}
          </div>
          <span>
            Giỏ hàng {totalCartItems > 0 ? `(${formatNumber(total)})` : ""}
          </span>
        </button>
      </div>

      {/* Center Screen Payment Success Popup */}
      {paymentSuccessPopup && paymentSuccessPopup.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={handleDismissSuccessPopup}
        >
          <div
            className="relative w-full max-w-sm p-6 rounded-2xl bg-card border-2 border-emerald-500/30 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200 select-none cursor-pointer overflow-hidden"
            onClick={(e) => {
              e.stopPropagation();
              handleDismissSuccessPopup();
            }}
          >
            {/* Top 2s Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-muted">
              <div className="h-full bg-emerald-500 transition-all duration-[2000ms] ease-linear w-0 animate-[progress_2s_linear_forwards]" />
            </div>

            {/* Glowing Icon Circle */}
            <div className="relative mx-auto flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 ring-8 ring-emerald-50 dark:ring-emerald-900/30 shadow-inner">
              <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <Check className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
            </div>

            {/* Title & Info */}
            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                SEPAY QR • TỰ ĐỘNG
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                ĐÃ NHẬN TIỀN THÀNH CÔNG!
              </h2>
              <p className="text-xs text-muted-foreground">
                Mã đơn: <strong className="text-foreground font-mono">{paymentSuccessPopup.orderCode}</strong>
              </p>
            </div>

            {/* Big Amount Box */}
            <div className="py-2.5 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50">
              <span className="text-xs text-muted-foreground font-medium block">Số tiền nhận được:</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{formatCurrency(paymentSuccessPopup.amount)}
              </span>
            </div>

            {/* Dismiss Button */}
            <Button
              className="w-full h-11 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2 rounded-xl"
              onClick={handleDismissSuccessPopup}
            >
              <Check className="h-4 w-4 stroke-[2.5]" /> Đã nhận tiền (Nhấn để đóng)
            </Button>
            <p className="text-[10px] text-muted-foreground">Tự động in bill sau 2 giây...</p>
          </div>
        </div>
      )}

      {/* Post-Checkout K80 Receipt Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent className="max-w-md p-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-emerald-600">
              <UserCheck className="h-5 w-5" /> Thanh toán hoàn tất!
            </DialogTitle>
          </DialogHeader>

          {successOrder && (
            <div className="space-y-4">
              <div
                id="k80-print-area"
                className="max-h-[55vh] overflow-y-auto border rounded p-2 bg-white"
              >
                <ReceiptK80
                  ref={printRef}
                  orderCode={successOrder.orderCode}
                  customerName={successOrder.customerName}
                  customerPhone={successOrder.customerPhone}
                  items={successOrder.items}
                  subtotal={successOrder.subtotal}
                  discount={successOrder.discount}
                  total={successOrder.total}
                  receivedAmount={successOrder.receivedAmount}
                  changeAmount={successOrder.changeAmount}
                  paymentMethod={successOrder.paymentMethod}
                  cashierName={successOrder.cashierName}
                  createdAt={successOrder.createdAt}
                  qrUrl={successOrder.qrUrl}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="flex-1 h-10" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" /> In hóa đơn (Print K80)
                </Button>
                <Button
                  variant="outline"
                  className="h-10"
                  onClick={() => {
                    setPrintDialogOpen(false);
                    searchInputRef.current?.focus();
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Đơn tiếp theo (F9)
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}



