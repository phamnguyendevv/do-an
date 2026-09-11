import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, Info, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { bookApi } from "@/lib/book-api";
import {
  downloadBookImportTemplate,
  parseBookExcelFile,
  type ParsedBookRow,
} from "@/lib/excel-service";
import { formatCurrency } from "@/utils/format";

export function ExcelBookImportDialog({
  trigger,
  onSuccess,
}: {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ParsedBookRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setErrors([]);
    setParsedData([]);

    try {
      const result = await parseBookExcelFile(file);
      setParsedData(result.data);
      setErrors(result.errors);

      if (result.data.length === 0 && result.errors.length > 0) {
        toast.error("Không đọc được dữ liệu sách từ file Excel!");
      } else {
        toast.success(`Đã nhận diện ${result.data.length} đầu sách từ file Excel.`);
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi đọc file Excel");
    } finally {
      setIsParsing(false);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast.error("Không có dữ liệu sách hợp lệ để nhập!");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < parsedData.length; i++) {
      const item = parsedData[i];
      try {
        await bookApi.create({
          title: item.title,
          author: item.author,
          category: item.category,
          purchasePrice: item.importPrice,
          sellingPrice: item.price,
          stock: item.stock,
          minStock: item.minStock,
          description: item.description,
        });
        successCount++;
      } catch (e) {
        console.warn(`Lỗi import sách "${item.title}":`, e);
        failCount++;
      }
      setProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setIsImporting(false);
    await queryClient.invalidateQueries({ queryKey: ["books"] });
    await queryClient.invalidateQueries({ queryKey: ["category-names"] });

    if (successCount > 0) {
      toast.success(`Đã nhập thành công ${successCount} cuốn sách vào hệ thống!`);
      setOpen(false);
      setParsedData([]);
      setFileName(null);
      onSuccess?.();
    } else {
      toast.error(`Nhập thất bại. Vui lòng kiểm tra lại kết nối backend.`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Upload className="mr-1.5 h-4 w-4" /> Nhập từ Excel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="h-5 w-5 text-primary" /> Nhập danh sách sách hàng loạt bằng
            file Excel
          </DialogTitle>
          <DialogDescription>
            Tải file mẫu, điền danh sách sách và tải lên để thêm hàng loạt đầu sách vào kho.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col pt-2">
          {/* Action Row: Download template & upload button */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 rounded-lg border">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="default"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isParsing || isImporting}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                {fileName ? "Chọn file khác..." : "Chọn file Excel (.xlsx)"}
              </Button>
              {fileName && (
                <span className="text-xs font-medium text-muted-foreground truncate max-w-[220px]">
                  {fileName}
                </span>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={downloadBookImportTemplate}>
              <Download className="mr-1.5 h-4 w-4" /> Tải file mẫu (.xlsx)
            </Button>
          </div>

          {/* Validation errors preview if any */}
          {errors.length > 0 && (
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded border border-rose-200 text-xs space-y-1 max-h-24 overflow-y-auto">
              <div className="flex items-center gap-1 font-semibold">
                <AlertCircle className="h-3.5 w-3.5" /> Có {errors.length} cảnh báo / lỗi định dạng:
              </div>
              <ul className="list-disc pl-4 space-y-0.5">
                {errors.slice(0, 5).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
                {errors.length > 5 && <li>...và {errors.length - 5} lỗi khác</li>}
              </ul>
            </div>
          )}

          {/* Parsed Books Preview Table */}
          {parsedData.length > 0 && (
            <div className="flex-1 overflow-hidden flex flex-col space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Danh sách xem trước: <strong>{parsedData.length}</strong> cuốn sách hợp lệ
                </span>
                {isImporting && (
                  <span className="font-semibold text-primary">Đang nhập: {progress}%</span>
                )}
              </div>

              <div className="flex-1 overflow-y-auto border rounded-md">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted sticky top-0 border-b">
                    <tr>
                      <th className="p-2 w-8">#</th>
                      <th className="p-2">Tên sách</th>
                      <th className="p-2">Tác giả</th>
                      <th className="p-2">Danh mục</th>
                      <th className="p-2 text-right">Giá nhập</th>
                      <th className="p-2 text-right">Giá bán</th>
                      <th className="p-2 text-right">Tồn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-muted/40">
                        <td className="p-2 text-muted-foreground">{idx + 1}</td>
                        <td className="p-2 font-medium">{item.title}</td>
                        <td className="p-2 text-muted-foreground">{item.author}</td>
                        <td className="p-2">{item.category}</td>
                        <td className="p-2 text-right tabular-nums">
                          {formatCurrency(item.importPrice)}
                        </td>
                        <td className="p-2 text-right font-semibold tabular-nums">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="p-2 text-right tabular-nums">{item.stock}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!parsedData.length && !isParsing && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed rounded-lg text-center text-muted-foreground">
              <FileSpreadsheet className="h-10 w-10 mb-2 opacity-30 text-primary" />
              <p className="text-sm font-medium">Chưa có file Excel nào được chọn</p>
              <p className="text-xs text-muted-foreground max-w-sm mt-1">
                Nhấn <strong>"Tải file mẫu (.xlsx)"</strong> để xem cấu trúc các cột, sau đó nhấn{" "}
                <strong>"Chọn file Excel"</strong> để tải dữ liệu lên.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isImporting}>
            Đóng
          </Button>
          <Button onClick={handleImport} disabled={parsedData.length === 0 || isImporting}>
            {isImporting
              ? `Đang nhập (${progress}%)...`
              : `Xác nhận nhập ${parsedData.length} cuốn sách`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
