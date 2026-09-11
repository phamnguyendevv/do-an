import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/utils/format";

const axisProps = {
  stroke: "var(--color-muted-foreground, #94a3b8)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#0f172a",
    borderColor: "#334155",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#f8fafc",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)",
    padding: "8px 12px",
  },
  itemStyle: {
    color: "#f8fafc",
    fontSize: "13px",
    fontWeight: 500,
  },
  labelStyle: {
    color: "#38bdf8",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "4px",
  },
} as const;

export function RevenueAreaChart({ data }: { data: Array<{ period: string; revenue: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border, #334155)"
          vertical={false}
        />
        <XAxis dataKey="period" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v: number) => `${v / 1_000_000}tr`} width={48} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v: number) => [formatCompactCurrency(v), "Doanh thu"]}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Doanh thu"
          stroke="#3b82f6"
          strokeWidth={2}
          fill="url(#revFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function StockMovementChart({
  data,
}: {
  data: Array<{ month: string; nhap: number; xuat: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border, #334155)"
          vertical={false}
        />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v: number, name: string) => [
            `${formatNumber(v)} cuốn`,
            name === "nhap" ? "Nhập kho" : "Xuất kho",
          ]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#cbd5e1" }} />
        <Bar dataKey="nhap" name="Nhập kho" fill="#10b981" radius={[4, 4, 0, 0]} />
        <Bar dataKey="xuat" name="Xuất kho" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BestSellersChart({
  data,
}: {
  data: Array<{ title: string; sold?: number; units?: number }>;
}) {
  const normalized = (data || []).map((d) => ({
    title: d.title,
    sold: typeof d.sold === "number" ? d.sold : typeof d.units === "number" ? d.units : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={normalized} layout="vertical" margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border, #334155)"
          horizontal={false}
        />
        <XAxis type="number" {...axisProps} />
        <YAxis type="category" dataKey="title" {...axisProps} width={130} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v: number) => [`${formatNumber(v)} cuốn`, "Đã bán"]}
        />
        <Bar dataKey="sold" name="Đã bán" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrdersLineChart({ data }: { data: Array<{ period: string; orders: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--color-border, #334155)"
          vertical={false}
        />
        <XAxis dataKey="period" {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip
          {...tooltipStyle}
          formatter={(v: number) => [`${formatNumber(v)} đơn`, "Số lượng đơn"]}
        />
        <Line
          type="monotone"
          dataKey="orders"
          name="Đơn hàng"
          stroke="#06b6d4"
          strokeWidth={2}
          dot={{ r: 3, fill: "#06b6d4" }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const pieColors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

export function CategoryPieChart({ data }: { data: Array<{ category: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Tooltip
          {...tooltipStyle}
          formatter={(v: number, name: string) => [formatCurrency(v), name || "Doanh thu"]}
        />
        <Legend wrapperStyle={{ fontSize: 12, color: "#cbd5e1" }} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="category"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={pieColors[i % pieColors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
