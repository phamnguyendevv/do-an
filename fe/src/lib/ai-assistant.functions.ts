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
          sort: {
            type: "string",
            enum: ["stock_asc", "stock_desc", "price_asc", "price_desc", "best_selling"],
          },
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
            enum: [
              "PENDING",
              "CONFIRMED",
              "PREPARING",
              "SHIPPING",
              "DELIVERED",
              "CANCELLED",
              "FAILED",
              "RETURNED",
            ],
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
        properties: {
          title: { type: "string" },
          days: { type: "number", description: "Số ngày thống kê bán, mặc định 30" },
        },
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

export const askAssistant = createServerFn({ method: "POST" })
  .validator((input: { messages: ChatMessage[] }) => input)
  .handler(async ({ data }): Promise<AssistantReply> => {
    // Gemini backend configuration
    const backendUrl = process.env["BACKEND_URL"] ?? "http://localhost:3000";
    const assistantEndpoint = `${backendUrl}/api/assistant/chat`;

    const res = await fetch(assistantEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        messages: data.messages,
        tools: TOOLS,
      }),
    });

    if (res.status === 429)
      return { ok: false, error: "Đã vượt giới hạn yêu cầu AI, vui lòng thử lại sau." };
    if (res.status === 402) return { ok: false, error: "Đã hết credit AI của workspace." };
    if (!res.ok) {
      const errorData = await res.text();
      return { ok: false, error: `Lỗi AI (${res.status}): ${errorData}` };
    }

    const json = (await res.json()) as {
      ok: boolean;
      error?: string;
      content?: string;
      toolCalls?: { id: string; name: string; args: string }[];
    };

    if (!json.ok) {
      return { ok: false, error: json.error ?? "Lỗi từ AI service." };
    }

    return {
      ok: true,
      content: json.content ?? "",
      toolCalls: json.toolCalls ?? [],
    };
  });
