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
import { formatCompactCurrency, formatNumber } from "@/utils/format";

const axisProps = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--color-popover-foreground)",
  },
} as const;

export function RevenueAreaChart({ data }: { data: Array<{ period: string; revenue: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="period" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={(v: number) => `${v / 1_000_000}tr`} width={48} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => formatCompactCurrency(v)} />
        <Area
          type="monotone"
          dataKey="revenue"
          name="Doanh thu"
          stroke="var(--color-chart-1)"
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
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => formatNumber(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="nhap" name="Nhập kho" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="xuat" name="Xuất kho" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BestSellersChart({ data }: { data: Array<{ title: string; sold: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
        <XAxis type="number" {...axisProps} />
        <YAxis type="category" dataKey="title" {...axisProps} width={130} />
        <Tooltip {...tooltipStyle} formatter={(v: number) => `${formatNumber(v)} cuốn`} />
        <Bar dataKey="sold" name="Đã bán" fill="var(--color-chart-1)" radius={[0, 4, 4, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OrdersLineChart({ data }: { data: Array<{ period: string; orders: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="period" {...axisProps} />
        <YAxis {...axisProps} width={40} />
        <Tooltip {...tooltipStyle} />
        <Line
          type="monotone"
          dataKey="orders"
          name="Đơn hàng"
          stroke="var(--color-chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

const pieColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

export function CategoryPieChart({ data }: { data: Array<{ category: string; value: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Tooltip {...tooltipStyle} formatter={(v: number) => formatCompactCurrency(v)} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Pie data={data} dataKey="value" nameKey="category" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((_, i) => (
            <Cell key={i} fill={pieColors[i % pieColors.length]} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
