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

const SEPAY_STORAGE_KEY = "bookstock_sepay_settings";
const STORE_STORAGE_KEY = "bookstock_store_branding";

export const defaultSepayConfig: SepayConfig = {
  bank: import.meta.env.VITE_SEPAY_BANK || "MBBank",
  accountNumber: import.meta.env.VITE_SEPAY_ACCOUNT || "00977512982",
  accountName: import.meta.env.VITE_SEPAY_ACCOUNT_NAME || "PHAM TRUNG NGUYEN",
  qrTemplate: "compact",
};

export const defaultStoreBranding: StoreBranding = {
  storeName: "NHÀ SÁCH BOOKSTOCK",
  address: "Số 123 Đường Sách, Q.1, TP. Hồ Chí Minh",
  hotline: "1900 6868",
  website: "bookstock.vn",
  footerNote: "Xin cảm ơn Quý khách & Hẹn gặp lại!",
};

export const storeSettingsService = {
  getSepayConfig(): SepayConfig {
    if (typeof window === "undefined") return defaultSepayConfig;
    try {
      const raw = localStorage.getItem(SEPAY_STORAGE_KEY);
      if (!raw) return defaultSepayConfig;
      return { ...defaultSepayConfig, ...JSON.parse(raw) };
    } catch {
      return defaultSepayConfig;
    }
  },

  saveSepayConfig(cfg: SepayConfig) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(SEPAY_STORAGE_KEY, JSON.stringify(cfg));
    } catch (e) {
      console.error("Lỗi lưu cấu hình SePay vào localStorage:", e);
    }
  },

  getStoreBranding(): StoreBranding {
    if (typeof window === "undefined") return defaultStoreBranding;
    try {
      const raw = localStorage.getItem(STORE_STORAGE_KEY);
      if (!raw) return defaultStoreBranding;
      return { ...defaultStoreBranding, ...JSON.parse(raw) };
    } catch {
      return defaultStoreBranding;
    }
  },

  saveStoreBranding(branding: StoreBranding) {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(branding));
    } catch (e) {
      console.error("Lỗi lưu thông tin cửa hàng vào localStorage:", e);
    }
  },

  /**
   * Tạo URL ảnh mã VietQR SePay động
   * Format: https://qr.sepay.vn/img?bank={bank}&acc={acc}&template={template}&amount={amount}&des={des}
   */
  getSepayQrUrl(amount: number, orderCode: string, templateOverride?: string): string {
    const config = this.getSepayConfig();
    const tpl = templateOverride || config.qrTemplate || "compact";
    const cleanOrderCode = orderCode.trim();
    return `https://qr.sepay.vn/img?bank=${encodeURIComponent(config.bank)}&acc=${encodeURIComponent(
      config.accountNumber,
    )}&template=${encodeURIComponent(tpl)}&amount=${Math.max(0, Math.round(amount))}&des=${encodeURIComponent(
      cleanOrderCode,
    )}`;
  },
};
