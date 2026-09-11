import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
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

export const Route = createFileRoute("/pos/minimal")({
  head: () => ({
    meta: [
      { title: "Bán tại quầy (POS) — BookStock" },
      {
        name: "description",
        content: "Màn hình bán lẻ tại quầy POS, thanh toán SePay QR và in hóa đơn K80.",
      },
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
  
  // Use customer lookup hook
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
  const [posOrderCode, setPosOrderCode] = useState<string>(
    () => `DH-${Date.now().toString().slice(-6)}`,
  );
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

      const bookCat = String(b.category || "")
        .trim()
        .toLowerCase();
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
    () =>
      cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0),
    [cart],
  );

  const total = useMemo(() => Math.max(0, subtotal - discountAmount), [subtotal, discountAmount]);

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
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (String(item.book.id) === String(bookId)) {
              const nextQty = item.quantity + delta;
              if (nextQty <= 0) return null;
              return { ...item, quantity: nextQty };
            }
            return item;
          })
          .filter((item) => item !== null) as CartItem[],
    );
  };

  // Remove item
  const removeItem = (bookId: string) => {
    setCart((prev) => prev.filter((item) => String(item.book.id) !== String(bookId)));
  };

  // Clear cart
  const clearCart = () => {
    if (totalCartItems === 0) return;
    if (window.confirm("Xác nhận xóa toàn bộ giỏ hàng?")) {
      setCart([]);
      setDiscountAmount(0);
      setReceivedCash("");
      setPaymentMethod("CASH");
    }
  };

  // Submit order
  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Giỏ hàng trống");
      return;
    }
    if (!customerName.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    if (total <= 0) {
      toast.error("Tổng tiền phải > 0");
      return;
    }
    if (isCashInsufficient) {
      toast.error("Tiền mặt không đủ");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        orderCode: currentOrderCode,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || "0900000000",
        items: cart.map((item) => ({
          bookId: item.book.id,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        discountAmount,
        total,
        paymentMethod,
        notes: "",
      };

      if (paymentMethod === "CASH") {
        payload.amountPaid = receivedCash;
        payload.change = changeCash;
      }

      const res = await orderApi.create(payload);
      const createdOrder = res?.data || res;

      setSuccessOrder({
        ...createdOrder,
        customerName,
        customerPhone,
      });
      setPrintDialogOpen(true);

      // Reset state
      setCart([]);
      setDiscountAmount(0);
      setReceivedCash("");
      setCustomerName("Khách lẻ");
      setCustomerPhone("");
      setPaymentMethod("CASH");
      setPosOrderCode(`DH-${Date.now().toString().slice(-6)}`);

      toast.success("Đơn hàng tạo thành công!");
    } catch (error: any) {
      toast.error(error?.message || "Lỗi khi tạo đơn hàng");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 p-2.5 sm:p-3 border-b flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold text-sm sm:text-base">Bán tại quầy (POS)</h1>
            <p className="text-xs text-muted-foreground">
              {cart.length}/{books.length} sách &bull; {formatCurrency(total)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-0">
        {/* Left Column: Products (Hidden on mobile cart view) */}
        <div
          className={`flex flex-col overflow-hidden ${
            mobileTab === "products" ? "flex-1 w-full" : "hidden md:flex md:flex-1"
          }`}
        >
          {/* Search */}
          <div className="shrink-0 p-2.5 sm:p-3 border-b bg-muted/20 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm sách, tác giả..."
                className="h-8 text-xs pl-8 bg-background"
                autoFocus
              />
            </div>
            {categories.length > 0 && (
              <div className="flex gap-1 overflow-x-auto pb-1">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs shrink-0 rounded-full"
                  onClick={() => setSelectedCategory("all")}
                >
                  Tất cả
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat}
                    variant={selectedCategory === cat ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs shrink-0 rounded-full"
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Products List */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-3">
            {displayedBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground text-center">
                <BookOpen className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm font-medium">Không có sách nào</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 auto-rows-max">
                {displayedBooks.map((book) => (
                  <button
                    key={book.id}
                    onClick={() => addToCart(book)}
                    disabled={book.stock <= 0}
                    className="flex flex-col gap-1 p-2 rounded-lg border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all text-left text-xs group"
                  >
                    <div className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                      {book.title}
                    </div>
                    <div className="text-muted-foreground text-[11px] line-clamp-1">
                      {book.author}
                    </div>
                    <div className="flex items-center justify-between pt-1 mt-auto">
                      <span className="font-bold text-primary">{formatCurrency(getBookSellingPrice(book))}</span>
                      <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        {book.stock}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {filteredBooks.length > visibleCount && (
              <div className="text-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVisibleCount((prev) => prev + 36)}
                >
                  Xem thêm ({Math.min(36, filteredBooks.length - visibleCount)} sách)
                </Button>
              </div>
            )}
          </div>
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
              <span className="font-semibold text-sm">Giỏ hàng ({totalCartItems} cuốn)</span>
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
                  placeholder="SĐT (tìm khách)"
                  className="h-8 text-xs bg-background"
                />
                {isLoadingCustomer && (
                  <Loader2 className="absolute right-2 top-1.5 h-4 w-4 animate-spin" />
                )}
              </div>
            </div>
            {/* Customer Suggestions Dropdown */}
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

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 -mr-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeItem(item.book.id)}
                    aria-label="Xóa sản phẩm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Totals & Payment */}
          {cart.length > 0 && (
            <>
              <div className="shrink-0 p-2.5 sm:p-3 border-t space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tạm tính</span>
                  <span className="font-semibold">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-orange-500">
                    <span>Giảm giá</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 font-bold text-sm">
                  <span>Tổng cộng</span>
                  <span className="text-primary">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="shrink-0 p-2.5 sm:p-3 border-t space-y-2">
                <Tabs
                  value={paymentMethod}
                  onValueChange={(v) => {
                    setPaymentMethod(v as any);
                    setReceivedCash("");
                  }}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3 h-7 text-xs">
                    <TabsTrigger value="CASH">Tiền mặt</TabsTrigger>
                    <TabsTrigger value="SEPAY">SePay</TabsTrigger>
                    <TabsTrigger value="CARD">Thẻ</TabsTrigger>
                  </TabsList>
                </Tabs>

                {paymentMethod === "CASH" && (
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <label className="block text-muted-foreground mb-1">
                        Khách thanh toán
                      </label>
                      <Input
                        type="number"
                        value={receivedCash === "" ? "" : receivedCash}
                        onChange={(e) =>
                          setReceivedCash(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="0"
                        className="h-8 text-xs"
                      />
                    </div>
                    {typeof receivedCash === "number" && (
                      <div className="flex justify-between font-semibold">
                        <span>Tiền thừa</span>
                        <span className={changeCash > 0 ? "text-green-500" : "text-destructive"}>
                          {formatCurrency(changeCash)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="shrink-0 p-2.5 sm:p-3 border-t">
                <Button
                  onClick={submitOrder}
                  disabled={
                    isSubmitting ||
                    cart.length === 0 ||
                    !customerName.trim() ||
                    isCashInsufficient
                  }
                  className="w-full h-9 text-sm font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Tạo đơn (
                      {formatCurrency(total)})
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Success & Print Dialog */}
      {successOrder && (
        <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>In hóa đơn</DialogTitle>
            </DialogHeader>
            <div ref={printRef}>
              <ReceiptK80
                orderCode={successOrder.orderCode}
                customerName={successOrder.customerName}
                customerPhone={successOrder.customerPhone}
                items={successOrder.items || []}
                subtotal={successOrder.subtotal || 0}
                discountAmount={successOrder.discountAmount || 0}
                total={successOrder.total || 0}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setPrintDialogOpen(false)}
              >
                Đóng
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="mr-2 h-4 w-4" /> In
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
