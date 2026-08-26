import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBooks } from "@/hooks/use-store";
import { formatCurrency } from "@/utils/format";

export interface ProductLine {
  bookId: string;
  quantity: number;
  price: number;
}

interface ProductLinesProps {
  lines: ProductLine[];
  onChange: (lines: ProductLine[]) => void;
  /** Show a price column (import/order) or not (export) */
  withPrice?: boolean;
  priceLabel?: string;
  /** Warn when the quantity exceeds current stock (export / order) */
  checkStock?: boolean;
}

export function ProductLines({
  lines,
  onChange,
  withPrice = true,
  priceLabel = "Giá nhập",
  checkStock = false,
}: ProductLinesProps) {
  const books = useBooks();

  const update = (index: number, patch: Partial<ProductLine>) =>
    onChange(lines.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  const add = () => onChange([...lines, { bookId: "", quantity: 1, price: 0 }]);
  const remove = (index: number) => onChange(lines.filter((_, i) => i !== index));

  const isImport = priceLabel.toLowerCase().includes("nhập");
  const selectedBookIds = lines.map((l) => String(l.bookId)).filter(Boolean);
  const allBooksSelected = books.length > 0 && selectedBookIds.length >= books.length;

  return (
    <div className="space-y-3">
      {lines.map((line, i) => {
        const book = books.find((b) => String(b.id) === String(line.bookId));
        const over = checkStock && book ? line.quantity > book.stock : false;
        const bookBasePrice = book
          ? isImport
            ? Number(book.purchasePrice ?? 0)
            : Number(book.sellingPrice ?? 0)
          : 0;

        // Loại bỏ các cuốn sách đã được chọn ở các dòng khác (trừ chính dòng hiện tại)
        const availableBooks = books.filter(
          (b) => String(b.id) === String(line.bookId) || !selectedBookIds.includes(String(b.id)),
        );

        return (
          <div
            key={i}
            className="rounded-lg border bg-card/60 p-3.5 shadow-sm transition-colors hover:border-border"
          >
            <div className="grid gap-3 sm:grid-cols-12 sm:items-start">
              {/* Cột 1: Sản phẩm */}
              <div className={withPrice ? "space-y-1.5 sm:col-span-5" : "space-y-1.5 sm:col-span-7"}>
                <Label className="text-xs font-semibold text-foreground">
                  Sản phẩm <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={line.bookId ? String(line.bookId) : ""}
                  onValueChange={(v) => {
                    const selected = books.find((b) => String(b.id) === String(v));
                    const newPrice = selected
                      ? isImport
                        ? Number(selected.purchasePrice ?? 0)
                        : Number(selected.sellingPrice ?? 0)
                      : 0;
                    update(i, {
                      bookId: v,
                      price: newPrice,
                    });
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Chọn sách trong kho..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBooks.length === 0 ? (
                      <div className="p-3 text-center text-xs text-muted-foreground">
                        {books.length === 0
                          ? "Chưa có sách nào trong kho. Vui lòng thêm sách trước."
                          : "Đã chọn hết tất cả sách trong kho."}
                      </div>
                    ) : (
                      availableBooks.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)}>
                          <span className="font-medium">{b.title}</span>
                          {b.author ? (
                            <span className="ml-1 text-xs text-muted-foreground"> — {b.author}</span>
                          ) : null}
                          {checkStock ? ` (tồn ${b.stock})` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {book ? (
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                    <span className={over ? "font-medium text-destructive" : "text-muted-foreground"}>
                      Tồn kho: <strong className="font-semibold text-foreground">{book.stock}</strong> cuốn
                    </span>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {isImport ? "Giá nhập sách: " : "Giá bán sách: "}
                      <strong className="text-foreground">{formatCurrency(bookBasePrice)}</strong>
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Cột 2: Số lượng */}
              <div className="space-y-1.5 sm:col-span-3">
                <Label className="text-xs font-semibold text-foreground">
                  Số lượng <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  min={1}
                  className="h-9"
                  value={line.quantity ?? 1}
                  onChange={(e) => update(i, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  aria-invalid={over}
                />
                {over ? (
                  <p className="text-[11px] font-medium text-destructive">
                    Không đủ tồn ({book?.stock} cuốn)
                  </p>
                ) : null}
              </div>

              {/* Cột 3: Giá */}
              {withPrice ? (
                <div className="space-y-1.5 sm:col-span-3">
                  <Label className="text-xs font-semibold text-foreground">
                    {priceLabel} (₫) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    className="h-9"
                    value={line.price ?? 0}
                    onChange={(e) => update(i, { price: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  {line.quantity > 0 && line.price > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      Thành tiền:{" "}
                      <span className="font-semibold text-foreground">
                        {formatCurrency(line.quantity * line.price)}
                      </span>
                    </p>
                  ) : null}
                </div>
              ) : null}

              {/* Cột 4: Nút xóa */}
              <div className="flex items-center justify-end pt-1 sm:col-span-1 sm:justify-center sm:pt-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => remove(i)}
                  disabled={lines.length === 1 && i === 0 && !line.bookId}
                  title="Xóa sản phẩm này"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={add}
          disabled={allBooksSelected || (lines.length > 0 && !lines[lines.length - 1]?.bookId)}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Thêm sản phẩm
        </Button>
        {allBooksSelected ? (
          <span className="text-xs text-muted-foreground">
            (Đã thêm toàn bộ {books.length} đầu sách trong kho)
          </span>
        ) : null}
      </div>
    </div>
  );
}
