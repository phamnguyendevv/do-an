import { createServerFn } from "@tanstack/react-start";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
}

export interface AssistantReply {
  ok: boolean;
  error?: string;
  content?: string;
  toolCalls?: { id: string; name: string; args: string }[];
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "analyze_warehouse",
      description:
        "Phân tích tổng quan tình trạng kho: tồn kho, sách sắp hết, hết hàng, bán nhanh, bán chậm, tồn lâu và cảnh báo.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_books",
      description: "Tìm/lọc sách theo từ khóa, thể loại, giá bán, tồn kho, trạng thái.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Từ khóa tên sách/tác giả" },
          category: { type: "string" },
          maxPrice: { type: "number", description: "Giá bán tối đa (VND)" },
          minPrice: { type: "number" },
          maxStock: { type: "number" },
          minStock: { type: "number" },
          status: { type: "string", enum: ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"] },
          sort: { type: "string", enum: ["stock_asc", "stock_desc", "price_asc", "price_desc", "best_selling"] },
          limit: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_orders",
      description: "Tìm đơn hàng theo trạng thái, khách hàng, mã đơn hoặc khoảng thời gian.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          status: {
            type: "string",
            enum: ["PENDING", "CONFIRMED", "PREPARING", "SHIPPING", "DELIVERED", "CANCELLED", "FAILED", "RETURNED"],
          },
          payment: { type: "string", enum: ["PAID", "UNPAID", "REFUNDED"] },
          period: { type: "string", enum: ["today", "7d", "30d", "all"] },
          limit: { type: "number" },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "check_stock",
      description: "Kiểm tra tồn kho và số lượng bán ra của một đầu sách theo tên.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" }, days: { type: "number", description: "Số ngày thống kê bán, mặc định 30" } },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_report",
      description: "Tạo báo cáo (kho, nhập/xuất, đơn hàng, doanh thu) cho một khoảng thời gian.",
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["inventory", "movement", "orders", "revenue"] },
          days: { type: "number" },
        },
        required: ["type"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_create_order",
      description:
        "CHUẨN BỊ (không thực thi) một đơn hàng mới để người dùng xác nhận. Chỉ gọi khi người dùng yêu cầu tạo đơn.",
      parameters: {
        type: "object",
        properties: {
          customerName: { type: "string" },
          customerPhone: { type: "string" },
          customerAddress: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, quantity: { type: "number" } },
              required: ["title", "quantity"],
            },
          },
        },
        required: ["customerName", "items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_import",
      description: "CHUẨN BỊ phiếu nhập kho để người dùng xác nhận.",
      parameters: {
        type: "object",
        properties: {
          supplier: { type: "string" },
          note: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, quantity: { type: "number" } },
              required: ["title", "quantity"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "prepare_export",
      description: "CHUẨN BỊ phiếu xuất kho để người dùng xác nhận.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string" },
          orderId: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: { title: { type: "string" }, quantity: { type: "number" } },
              required: ["title", "quantity"],
            },
          },
        },
        required: ["items"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "navigate",
      description: "Đề xuất điều hướng người dùng tới một trang trong hệ thống.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" }, label: { type: "string" } },
        required: ["path"],
      },
    },
  },
];

function normalizeGeminiToolCalls(parts: Array<{ text?: string; functionCall?: { name?: string; args?: Record<string, unknown> } }>) {
  const toolCalls: { id: string; name: string; args: string }[] = [];
  let text = "";

  for (const part of parts ?? []) {
    if (typeof part.text === "string" && part.text.trim()) {
      text += `${part.text}\n`;
    }

    if (part.functionCall?.name) {
      toolCalls.push({
        id: `gemini_call_${toolCalls.length + 1}`,
        name: part.functionCall.name,
        args: JSON.stringify(part.functionCall.args ?? {}),
      });
    }
  }

  return { text: text.trim(), toolCalls };
}

export const askAssistant = createServerFn({ method: "POST" })
  .validator((input: { messages: ChatMessage[] }) => input)
  .handler(async ({ data }): Promise<AssistantReply> => {
    const requestedProvider = (process.env["AI_PROVIDER"] ?? "").toLowerCase();
    const baseUrlFromEnv = process.env["AI_API_BASE_URL"] ?? "";
    const inferredProvider = baseUrlFromEnv.includes("googleapis")
      ? "gemini"
      : baseUrlFromEnv.includes("openrouter")
        ? "openrouter"
        : requestedProvider || "openai";
    const provider = inferredProvider.toLowerCase();

    const key =
      provider === "gemini"
        ? process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_API_KEY"] ?? process.env["AI_API_KEY"]
        : provider === "openrouter"
          ? process.env["OPENROUTER_API_KEY"] ?? process.env["AI_API_KEY"]
          : process.env["OPENAI_API_KEY"] ?? process.env["AI_API_KEY"];

    if (!key) {
      return {
        ok: false,
        error:
          provider === "gemini"
            ? "Chưa cấu hình Gemini. Vui lòng thiết lập biến GEMINI_API_KEY hoặc AI_API_KEY."
            : provider === "openrouter"
              ? "Chưa cấu hình OpenRouter. Vui lòng thiết lập biến OPENROUTER_API_KEY hoặc AI_API_KEY."
              : "Chưa cấu hình AI. Vui lòng thiết lập biến OPENAI_API_KEY hoặc AI_API_KEY.",
      };
    }

    if (provider === "gemini") {
      const apiBaseUrl = process.env["AI_API_BASE_URL"] ?? "https://generativelanguage.googleapis.com/v1beta";
      const model = process.env["AI_MODEL"] ?? "gemini-2.0-flash";
      const systemMessages = data.messages.filter((message) => message.role === "system");
      const contents = data.messages
        .filter((message) => message.role !== "system")
        .map((message) => {
          const content = message.role === "tool" ? `Tool result (${message.tool_call_id ?? "unknown"}): ${message.content}` : message.content;
          return {
            role: message.role === "assistant" ? "model" : "user",
            parts: [{ text: content || " " }],
          };
        });

      const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          systemInstruction: systemMessages.length
            ? { parts: systemMessages.map((message) => ({ text: message.content })) }
            : undefined,
          contents,
          tools: [
            {
              functionDeclarations: TOOLS.map((tool) => ({
                name: tool.function.name,
                description: tool.function.description,
                parameters: tool.function.parameters,
              })),
            },
          ],
        }),
      });

      if (res.status === 429) return { ok: false, error: "Đã vượt giới hạn yêu cầu AI, vui lòng thử lại sau." };
      if (res.status === 402) return { ok: false, error: "Đã hết credit AI của workspace." };
      if (!res.ok) return { ok: false, error: `Lỗi AI Gemini (${res.status}).` };

      const json = (await res.json()) as {
        candidates?: {
          content?: {
            parts?: Array<{ text?: string; functionCall?: { name?: string; args?: Record<string, unknown> } }>;
          };
        }[];
      };

      const candidate = json.candidates?.[0];
      const normalized = normalizeGeminiToolCalls(candidate?.content?.parts ?? []);
      return {
        ok: true,
        content: normalized.text,
        toolCalls: normalized.toolCalls,
      };
    }

    const apiBaseUrl = process.env["AI_API_BASE_URL"] ?? (provider === "openrouter" ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1");
    const model = process.env["AI_MODEL"] ?? (provider === "openrouter" ? "openai/gpt-4o-mini" : "gpt-4o-mini");
    const headers: Record<string, string> = {
      Authorization: `Bearer ${key}`,
      "content-type": "application/json",
    };

    if (provider === "openrouter") {
      const siteUrl = process.env["OPENROUTER_SITE_URL"] ?? "http://localhost:5173";
      const appName = process.env["OPENROUTER_APP_NAME"] ?? "BookStock AI";
      headers["HTTP-Referer"] = siteUrl;
      headers["X-Title"] = appName;
    }

    const res = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages: data.messages,
        tools: TOOLS,
      }),
    });

    if (res.status === 429) return { ok: false, error: "Đã vượt giới hạn yêu cầu AI, vui lòng thử lại sau." };
    if (res.status === 402) return { ok: false, error: "Đã hết credit AI của workspace." };
    if (!res.ok) return { ok: false, error: `Lỗi AI ${provider === "openrouter" ? "OpenRouter" : "OpenAI"} (${res.status}).` };

    const json = (await res.json()) as {
      choices?: { message?: { content?: string; tool_calls?: { id: string; function: { name: string; arguments: string } }[] } }[];
    };
    const msg = json.choices?.[0]?.message;
    return {
      ok: true,
      content: msg?.content ?? "",
      toolCalls: (msg?.tool_calls ?? []).map((t) => ({ id: t.id, name: t.function.name, args: t.function.arguments })),
    };
  });
