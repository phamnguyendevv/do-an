import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit3,
  MessageSquare,
  PackageCheck,
  PackagePlus,
  QrCode,
  Send,
  ShieldCheck,
  Truck,
  User,
  XCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Building2,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/shared/status-badge";
import { orderApi } from "@/lib/order-api";
import type { Order, OrderHistoryItem } from "@/types";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { orderStatusLabel, orderStatusTone, paymentLabel, paymentTone } from "@/utils/status";

interface OrderTimelineProps {
  order: Order;
}

const ACTION_CONFIG: Record<
  string,
  {
    icon: any;
    label: string;
    bgClass: string;
    textClass: string;
    borderClass: string;
    badgeTone: "positive" | "info" | "warning" | "negative" | "brand" | "neutral";
  }
> = {
  CREATED: {
    icon: PackagePlus,
    label: "Tạo đơn hàng",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/50",
    textClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    badgeTone: "positive",
  },
  STATUS_CHANGE: {
    icon: CheckCircle2,
    label: "Đổi trạng thái",
    bgClass: "bg-blue-50 dark:bg-blue-950/50",
    textClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-200 dark:border-blue-800",
    badgeTone: "info",
  },
  PAYMENT_CHANGE: {
    icon: CreditCard,
    label: "Thanh toán",
    bgClass: "bg-purple-50 dark:bg-purple-950/50",
    textClass: "text-purple-600 dark:text-purple-400",
    borderClass: "border-purple-200 dark:border-purple-800",
    badgeTone: "brand",
  },
  SEPAY_PAYMENT: {
    icon: QrCode,
    label: "SePay QR",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/50",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-300 dark:border-emerald-700",
    badgeTone: "positive",
  },
  GHN_SYNC: {
    icon: Truck,
    label: "Đồng bộ GHN",
    bgClass: "bg-amber-50 dark:bg-amber-950/50",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-200 dark:border-amber-800",
    badgeTone: "warning",
  },
  UPDATED_INFO: {
    icon: Edit3,
    label: "Chỉnh sửa đơn",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/50",
    textClass: "text-indigo-600 dark:text-indigo-400",
    borderClass: "border-indigo-200 dark:border-indigo-800",
    badgeTone: "neutral",
  },
  NOTE_ADDED: {
    icon: MessageSquare,
    label: "Ghi chú nội bộ",
    bgClass: "bg-yellow-50 dark:bg-yellow-950/50",
    textClass: "text-yellow-700 dark:text-yellow-400",
    borderClass: "border-yellow-200 dark:border-yellow-800",
    badgeTone: "warning",
  },
  CANCELLED: {
    icon: XCircle,
    label: "Hủy đơn hàng",
    bgClass: "bg-rose-50 dark:bg-rose-950/50",
    textClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-rose-200 dark:border-rose-800",
    badgeTone: "negative",
  },
};

export function OrderTimeline({ order }: OrderTimelineProps) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

  const targetId = order.orderCode || order.id;

  const {
    data: histories = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["order-histories", targetId],
    queryFn: async () => {
      try {
        const res = await orderApi.getHistories(targetId);
        return Array.isArray(res) ? res : [];
      } catch (err) {
        console.warn("Failed to fetch order histories:", err);
        return [];
      }
    },
    staleTime: 10_000,
  });

  const addNoteMutation = useMutation({
    mutationFn: async (note: string) => {
      return await orderApi.addNote(targetId, note);
    },
    onSuccess: () => {
      toast.success("Đã thêm ghi chú xử lý vào timeline đơn hàng");
      setNoteText("");
      setShowNoteForm(false);
      refetch();
      queryClient.invalidateQueries({ queryKey: ["order-histories", targetId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Không thể thêm ghi chú");
    },
  });

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) {
      toast.error("Vui lòng nhập nội dung ghi chú");
      return;
    }
    addNoteMutation.mutate(noteText);
  };

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Fallback if histories is empty: generate synthetic initial create item
  const displayItems: OrderHistoryItem[] =
    histories.length > 0
      ? histories
      : [
          {
            id: 0,
            orderId: Number(order.id) || 0,
            orderCode: order.orderCode || order.id,
            action: "CREATED",
            title: "Tạo đơn hàng",
            toStatus: order.status,
            toPayment: order.payment,
            note: `Đơn hàng được khởi tạo với ${order.items?.length || 0} sản phẩm. Tổng tiền: ${formatCurrency(order.total)}`,
            actor: "Hệ thống / Staff",
            createdAt: order.createdAt || new Date().toISOString(),
          },
        ];

  return (
    <Card className="shadow-none border-border/80">
      <CardHeader className="pb-3 border-b bg-muted/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-0.5">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Lịch sử đơn hàng & Nhật ký xử lý
              <span className="ml-1 text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {displayItems.length} sự kiện
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Ghi nhận tự động mọi thay đổi trạng thái, thanh toán, đồng bộ vận chuyển và ghi chú
              nội bộ.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNoteForm(!showNoteForm)}
            className="gap-1.5 h-8 text-xs font-medium"
          >
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            {showNoteForm ? "Đóng form" : "Thêm ghi chú xử lý"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 space-y-6">
        {/* Quick Add Note Form */}
        {showNoteForm && (
          <form
            onSubmit={handleAddNote}
            className="p-3.5 rounded-lg border bg-muted/40 space-y-3 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                Ghi chú nội bộ cho đơn {order.orderCode || order.id}
              </label>
              <span className="text-[11px] text-muted-foreground">
                Hiển thị trong timeline nội bộ
              </span>
            </div>
            <Textarea
              placeholder="VD: Đã gọi khách xác nhận địa chỉ; Hẹn giao sau 18h; Chờ hàng nhập thêm..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={2}
              className="text-xs resize-none bg-background"
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setShowNoteForm(false);
                  setNoteText("");
                }}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={addNoteMutation.isPending || !noteText.trim()}
                className="h-7 text-xs gap-1"
              >
                <Send className="h-3 w-3" />
                {addNoteMutation.isPending ? "Đang lưu..." : "Lưu ghi chú"}
              </Button>
            </div>
          </form>
        )}

        {/* Vertical Timeline */}
        {isLoading ? (
          <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
            Đang tải dữ liệu lịch sử đơn hàng...
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
            {displayItems.map((item, idx) => {
              const cfg = ACTION_CONFIG[item.action] || {
                icon: FileText,
                label: item.action,
                bgClass: "bg-muted",
                textClass: "text-foreground",
                borderClass: "border-border",
                badgeTone: "neutral",
              };
              const IconComp = cfg.icon;
              const hasMetadata =
                item.metadata &&
                typeof item.metadata === "object" &&
                Object.keys(item.metadata).length > 0;
              const isExpanded = expandedItems[item.id] || false;

              return (
                <div key={item.id || idx} className="relative group">
                  {/* Timeline Dot Icon */}
                  <div
                    className={`absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full border shadow-xs ${cfg.bgClass} ${cfg.borderClass} ${cfg.textClass}`}
                  >
                    <IconComp className="h-3.5 w-3.5" />
                  </div>

                  {/* Event Content Box */}
                  <div className="rounded-lg border bg-card p-3.5 space-y-2 hover:border-muted-foreground/30 transition-colors shadow-xs">
                    {/* Header Row */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-foreground">{item.title}</span>
                        <StatusBadge tone={cfg.badgeTone} className="text-[10px] py-0 px-1.5">
                          {cfg.label}
                        </StatusBadge>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actor & Role Badge */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-foreground/80 bg-muted/60 px-2 py-0.5 rounded">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {item.actor || "Hệ thống"}
                        {item.actorRole && (
                          <span className="text-[10px] text-muted-foreground font-normal">
                            ({item.actorRole})
                          </span>
                        )}
                      </span>

                      {/* State transitions badges if present */}
                      {item.fromStatus && item.toStatus && item.fromStatus !== item.toStatus && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-muted-foreground">Trạng thái:</span>
                          <span className="font-medium text-muted-foreground">
                            {orderStatusLabel[item.fromStatus as any] || item.fromStatus}
                          </span>
                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                          <span className="font-semibold text-primary">
                            {orderStatusLabel[item.toStatus as any] || item.toStatus}
                          </span>
                        </div>
                      )}

                      {item.fromPayment &&
                        item.toPayment &&
                        item.fromPayment !== item.toPayment && (
                          <div className="flex items-center gap-1 text-[11px]">
                            <span className="text-muted-foreground">Thanh toán:</span>
                            <span className="font-medium text-muted-foreground">
                              {paymentLabel[item.fromPayment as any] || item.fromPayment}
                            </span>
                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                            <span className="font-semibold text-emerald-600">
                              {paymentLabel[item.toPayment as any] || item.toPayment}
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Note Content */}
                    {item.note && (
                      <p className="text-xs text-foreground/90 leading-relaxed bg-muted/30 p-2 rounded border border-border/50">
                        {item.note}
                      </p>
                    )}

                    {/* Special Display for SePay QR Transactions */}
                    {item.action === "SEPAY_PAYMENT" && item.metadata && (
                      <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-2.5 text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                            Cổng SePay: {item.metadata.gateway || "Ngân hàng"}
                          </span>
                          <span className="font-bold tabular-nums">
                            +{formatCurrency(Number(item.metadata.transferAmount || order.total))}
                          </span>
                        </div>
                        {item.metadata.referenceCode && (
                          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 flex justify-between">
                            <span>Mã GD / Tham chiếu:</span>
                            <span className="font-mono">{item.metadata.referenceCode}</span>
                          </div>
                        )}
                        {item.metadata.content && (
                          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-400 flex justify-between">
                            <span>Nội dung CK:</span>
                            <span className="font-mono truncate max-w-[240px]">
                              {item.metadata.content}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Metadata Toggle for Debug / Details */}
                    {hasMetadata && item.action !== "SEPAY_PAYMENT" && (
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 font-medium transition-colors"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" /> Thu gọn chi tiết kỹ thuật
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" /> Xem chi tiết dữ liệu (Snapshot)
                            </>
                          )}
                        </button>
                        {isExpanded && (
                          <pre className="mt-2 text-[10px] font-mono bg-muted/60 p-2 rounded border overflow-x-auto text-muted-foreground">
                            {JSON.stringify(item.metadata, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
