import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Pencil } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { BookFormDialog } from "@/components/books/book-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useBooks } from "@/hooks/use-store";
import { bookApi, type BookApiItem } from "@/lib/book-api";
import { formatCurrency, formatDate, formatNumber } from "@/utils/format";
import { bookStatusLabel, bookStatusTone } from "@/utils/status";
import { Can } from "@/lib/ability";
import type { Book } from "@/types";

const mapApiBook = (book: BookApiItem): Book => {
  const stock = Number(book?.stock ?? 0);
  const minStock = Number(book?.minStock ?? 0);
  const purchasePrice = Number(book?.purchasePrice ?? (book as any)?.importPrice ?? 0);
  const sellingPrice = Number(book?.sellingPrice ?? (book as any)?.price ?? 0);
  const rawStatus =
    (book?.status as any) ||
    (stock === 0 ? "OUT_OF_STOCK" : stock <= minStock ? "LOW_STOCK" : "IN_STOCK");

  return {
    id: String(book?.id ?? ""),
    title: String(book?.title ?? ""),
    author: String(book?.author ?? ""),
    category: String(book?.category ?? ""),
    purchasePrice,
    sellingPrice,
    price: sellingPrice,
    importPrice: purchasePrice,
    stock,
    minStock,
    status: rawStatus,
    createdAt:
      typeof book?.createdAt === "string"
        ? book.createdAt
        : new Date(book?.createdAt ?? Date.now()).toISOString(),
  };
};

export const Route = createFileRoute("/books/$bookId")({
  loader: async ({ params }) => {
    try {
      const book = await bookApi.get(params.bookId);
      if (!book) throw notFound();
      return { book: mapApiBook(book) };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Không tìm thấy sách — BookStock" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    return {
      meta: [
        { title: `${loaderData.book.title} — BookStock` },
        {
          name: "description",
          content: `Chi tiết đầu sách ${loaderData.book.title} của ${loaderData.book.author}.`,
        },
        { property: "og:title", content: `${loaderData.book.title} — BookStock` },
        {
          property: "og:description",
          content: `Thông tin giá, tồn kho và danh mục của ${loaderData.book.title}.`,
        },
      ],
    };
  },
  component: BookDetailPage,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function BookDetailPage() {
  const { book: loadedBook } = Route.useLoaderData();
  const books = useBooks();
  const book = books.find((b) => b.id === loadedBook.id) ?? loadedBook;
  const sellingPrice = book.sellingPrice ?? book.price ?? 0;
  const purchasePrice = book.purchasePrice ?? book.importPrice ?? 0;
  const margin = sellingPrice - purchasePrice;
  const marginPct = sellingPrice > 0 ? ((margin / sellingPrice) * 100).toFixed(1) : "0";

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Sách", href: "/books" },
        { label: book.title },
      ]}
    >
      <PageContainer>
        <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit text-muted-foreground">
          <Link to="/books">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại danh sách
          </Link>
        </Button>

        <PageHeader
          title={book.title}
          description={`${book.author} · ${book.category}`}
          actions={
            <Can I="update" a="Book">
              <BookFormDialog
                book={book}
                trigger={
                  <Button size="sm" variant="outline">
                    <Pencil className="mr-1.5 h-4 w-4" /> Chỉnh sửa
                  </Button>
                }
              />
            </Can>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Tồn kho"
            value={formatNumber(book.stock)}
            hint={`Tối thiểu ${book.minStock}`}
          />
          <StatCard label="Giá bán" value={formatCurrency(sellingPrice)} />
          <StatCard label="Giá nhập" value={formatCurrency(purchasePrice)} />
          <StatCard
            label="Lợi nhuận / cuốn"
            value={formatCurrency(margin)}
            hint={`${marginPct}% biên lợi nhuận`}
            trend="up"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="shadow-none">
            <CardHeader className="pb-1">
              <CardTitle className="text-base">Thông tin sách</CardTitle>
            </CardHeader>
            <CardContent className="divide-y">
              <Row label="Mã sách" value={<span className="font-mono text-xs">{book.id}</span>} />
              <Row label="Tác giả" value={book.author} />
              <Row label="Danh mục" value={book.category} />
              <Row label="Ngày tạo" value={formatDate(book.createdAt)} />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-1">
              <CardTitle className="text-base">Tồn kho & trạng thái</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="divide-y">
                <Row
                  label="Trạng thái"
                  value={
                    <StatusBadge tone={bookStatusTone[book.status]}>
                      {bookStatusLabel[book.status]}
                    </StatusBadge>
                  }
                />
                <Row label="Tồn hiện tại" value={formatNumber(book.stock)} />
                <Row label="Tồn tối thiểu" value={formatNumber(book.minStock)} />
                <Row label="Giá trị tồn" value={formatCurrency(book.stock * purchasePrice)} />
              </div>
              <Separator className="my-4" />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to="/inventory/import">Nhập kho</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link to="/inventory/export">Xuất kho</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </AppShell>
  );
}
