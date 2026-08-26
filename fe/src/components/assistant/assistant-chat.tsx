import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Bot, Loader2, Send, Sparkles, User as UserIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { askAssistant, type ChatMessage } from "@/lib/ai-assistant.functions";
import { executeTool, type PendingAction } from "@/services/assistant-tools";
import { analyzeWarehouse } from "@/services/warehouse-intel";
import { store } from "@/services/store";
import { ActionPreview } from "./action-preview";

interface Bubble {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: PendingAction[];
  error?: boolean;
}

const SUGGESTIONS = [
  "Phân tích tình trạng kho hiện tại",
  "Tìm sách công nghệ dưới 200 nghìn còn dưới 30 cuốn",
  "Cho tôi xem các đơn hàng đang giao",
  "Tạo báo cáo tình hình kho tháng này",
  "Đắc Nhân Tâm còn bao nhiêu cuốn?",
];

function systemPrompt() {
  const snap = store.getSnapshot();
  const a = analyzeWarehouse({ books: snap.books, orders: snap.orders, imports: snap.imports, exports: snap.exports });
  return `Bạn là AI Warehouse Assistant của hệ thống quản lý kho sách BookStock. Trả lời bằng tiếng Việt, ngắn gọn, có cấu trúc (dùng markdown đơn giản: tiêu đề, gạch đầu dòng).

Nguyên tắc:
- Luôn dùng tool để lấy dữ liệu thật, không được bịa số liệu.
- Ưu tiên insight hành động được, kèm đề xuất cụ thể.
- Với yêu cầu thay đổi dữ liệu (tạo đơn, nhập kho, xuất kho) chỉ được gọi tool prepare_* để tạo bản xem trước; người dùng sẽ tự bấm xác nhận. Không bao giờ khẳng định là đã thực hiện xong.
- Nếu yêu cầu mơ hồ, nêu rõ cách bạn đã hiểu (bộ lọc áp dụng) trước khi đưa kết quả.
- Giữ ngữ cảnh hội thoại: đại từ hoặc câu hỏi tiếp theo tham chiếu tới đối tượng vừa nhắc.

Bối cảnh nhanh (ngày ${new Date().toLocaleDateString("vi-VN")}): ${a.totals.titles} đầu sách, ${a.totals.stock} cuốn tồn, ${a.totals.lowStock} sắp hết, ${a.totals.outOfStock} hết hàng.`;
}

export function AssistantChat() {
  const ask = useServerFn(askAssistant);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const history = useRef<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [bubbles, loading]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    setBubbles((b) => [...b, { id: crypto.randomUUID(), role: "user", content: question }]);
    setLoading(true);

    if (history.current.length === 0) history.current.push({ role: "system", content: systemPrompt() });
    history.current.push({ role: "user", content: question });

    const actions: PendingAction[] = [];
    try {
      for (let step = 0; step < 4; step++) {
        const reply = await ask({ data: { messages: history.current } });
        if (!reply.ok) {
          setBubbles((b) => [
            ...b,
            { id: crypto.randomUUID(), role: "assistant", content: reply.error ?? "Lỗi không xác định.", error: true },
          ]);
          return;
        }
        const calls = reply.toolCalls ?? [];
        if (calls.length === 0) {
          history.current.push({ role: "assistant", content: reply.content ?? "" });
          setBubbles((b) => [
            ...b,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: reply.content || "Mình chưa có câu trả lời cho yêu cầu này.",
              ...(actions.length ? { actions } : {}),
            },
          ]);
          return;
        }

        history.current.push({
          role: "assistant",
          content: reply.content ?? "",
          tool_calls: calls.map((c) => ({ id: c.id, type: "function" as const, function: { name: c.name, arguments: c.args } })),
        });
        for (const call of calls) {
          const outcome = executeTool(call.name, call.args);
          if (outcome.action) actions.push(outcome.action);
          history.current.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(outcome.result).slice(0, 12000),
          });
        }
      }
      setBubbles((b) => [
        ...b,
        { id: crypto.randomUUID(), role: "assistant", content: "Yêu cầu quá phức tạp, bạn thử chia nhỏ câu hỏi nhé.", error: true },
      ]);
    } catch {
      setBubbles((b) => [
        ...b,
        { id: crypto.randomUUID(), role: "assistant", content: "Không kết nối được tới AI. Vui lòng thử lại.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="flex h-[calc(100vh-15rem)] min-h-[26rem] flex-col">
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 p-0">
        <ScrollArea className="min-h-0 flex-1 px-4 pt-4">
          {bubbles.length === 0 ? (
            <div className="space-y-4 py-6 text-center">
              <Sparkles className="mx-auto size-8 text-primary" />
              <div>
                <p className="font-medium">Trợ lý kho AI</p>
                <p className="text-sm text-muted-foreground">
                  Hỏi bằng ngôn ngữ tự nhiên: tra tồn kho, lọc dữ liệu, tạo báo cáo hay chuẩn bị đơn hàng.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button key={s} size="sm" variant="outline" onClick={() => void send(s)}>
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <ul className="space-y-4 pb-4">
              {bubbles.map((b) => (
                <li key={b.id} className="flex gap-3">
                  <span
                    className={`mt-1 flex size-7 shrink-0 items-center justify-center rounded-full ${
                      b.role === "user" ? "bg-muted" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {b.role === "user" ? <UserIcon className="size-4" /> : <Bot className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div
                      className={`whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${
                        b.error ? "bg-destructive/10 text-destructive" : b.role === "user" ? "bg-muted" : "bg-card border"
                      }`}
                    >
                      {b.content}
                    </div>
                    {b.actions?.map((a, i) => <ActionPreview key={i} action={a} />)}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {loading ? (
            <p className="flex items-center gap-2 pb-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Đang phân tích dữ liệu kho…
            </p>
          ) : null}
          <div ref={endRef} />
        </ScrollArea>

        <form
          className="flex gap-2 border-t p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi trợ lý kho… ví dụ: sách nào sắp hết hàng?"
            aria-label="Câu hỏi cho trợ lý AI"
            disabled={loading}
          />
          <Button type="submit" disabled={loading || !input.trim()} aria-label="Gửi">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
