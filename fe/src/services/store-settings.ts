export interface SepayConfig {
  bank: string;
  accountNumber: string;
  accountName: string;
  qrTemplate: "compact" | "compact2" | "qr_only" | "default";
}

export interface StoreBranding {
  storeName: string;
  address: string;
  hotline: string;
  website: string;
  footerNote: string;
}

export interface BankOption {
  code: string;
  name: string;
  shortName: string;
  bin?: string;
}

export const VIETNAM_BANKS: BankOption[] = [
  { code: "MBBank", name: "Ngân hàng TMCP Quân Đội", shortName: "MBBank (MB)" },
  {
    code: "Vietcombank",
    name: "Ngân hàng TMCP Ngoại Thương Việt Nam",
    shortName: "Vietcombank (VCB)",
  },
  {
    code: "Techcombank",
    name: "Ngân hàng TMCP Kỹ Thương Việt Nam",
    shortName: "Techcombank (TCB)",
  },
  { code: "ACB", name: "Ngân hàng TMCP Á Châu", shortName: "ACB" },
  { code: "VPBank", name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", shortName: "VPBank (VPB)" },
  { code: "TPBank", name: "Ngân hàng TMCP Tiên Phong", shortName: "TPBank (TPB)" },
  {
    code: "VietinBank",
    name: "Ngân hàng TMCP Công Thương Việt Nam",
    shortName: "VietinBank (ICB)",
  },
  { code: "BIDV", name: "Ngân hàng TMCP Đầu Tư và Phát Triển Việt Nam", shortName: "BIDV" },
  { code: "Sacombank", name: "Ngân hàng TMCP Sài Gòn Thương Tín", shortName: "Sacombank (STB)" },
  { code: "VIB", name: "Ngân hàng TMCP Quốc Tế Việt Nam", shortName: "VIB" },
  { code: "HDBank", name: "Ngân hàng TMCP Phát Triển TP.HCM", shortName: "HDBank" },
  {
    code: "Agribank",
    name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn",
    shortName: "Agribank (VBA)",
  },
  { code: "MSB", name: "Ngân hàng TMCP Hàng Hải Việt Nam", shortName: "MSB" },
  { code: "OCB", name: "Ngân hàng TMCP Phương Đông", shortName: "OCB" },
  { code: "SHB", name: "Ngân hàng TMCP Sài Gòn - Hà Nội", shortName: "SHB" },
  { code: "LPBank", name: "Ngân hàng TMCP Lộc Phát Việt Nam", shortName: "LPBank" },
  { code: "SeABank", name: "Ngân hàng TMCP Đông Nam Á", shortName: "SeABank" },
];

export const defaultSepayConfig: SepayConfig = {
  bank: import.meta.env["VITE_SEPAY_BANK"] || "MBBank",
  accountNumber: import.meta.env["VITE_SEPAY_ACCOUNT"] || "00977512982",
  accountName: import.meta.env["VITE_SEPAY_ACCOUNT_NAME"] || "PHAM TRUNG NGUYEN",
  qrTemplate: "compact",
};

export const defaultStoreBranding: StoreBranding = {
  storeName: "NHÀ SÁCH BOOKSTOCK",
  address: "Số 123 Đường Sách, Q.1, TP. Hồ Chí Minh",
  hotline: "1900 6868",
  website: "bookstock.vn",
  footerNote: "Xin cảm ơn Quý khách & Hẹn gặp lại!",
};

export function buildSepayQrUrl(config: SepayConfig, amount: number, orderCode: string): string {
  const cleanOrderCode = orderCode.trim();
  return `https://qr.sepay.vn/img?bank=${encodeURIComponent(config.bank)}&acc=${encodeURIComponent(
    config.accountNumber,
  )}&template=${encodeURIComponent(config.qrTemplate)}&amount=${Math.max(0, Math.round(amount))}&des=${encodeURIComponent(
    cleanOrderCode,
  )}`;
}
