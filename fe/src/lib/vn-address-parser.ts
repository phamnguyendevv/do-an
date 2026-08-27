import type { GhnDistrict, GhnProvince, GhnWard } from "./ghn-api";

/**
 * Remove Vietnamese accents/diacritics
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Clean & normalize text for matching (lowercase, no accents, single spaces)
 */
export function normalizeText(str: string): string {
  return removeVietnameseAccents(str)
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Common Vietnamese province aliases and abbreviations
 */
export const PROVINCE_ALIASES: Record<string, string[]> = {
  "Hồ Chí Minh": [
    "thanh pho ho chi minh",
    "tp ho chi minh",
    "tp. ho chi minh",
    "tp.ho chi minh",
    "ho chi minh",
    "tphcm",
    "tp hcm",
    "tp.hcm",
    "tp. hcm",
    "sai gon",
    "hcm",
    "sg",
  ],
  "Hà Nội": [
    "thanh pho ha noi",
    "tp ha noi",
    "tp. ha noi",
    "tp.ha noi",
    "ha noi",
    "tphn",
    "tp hn",
    "tp.hn",
    "thu do",
    "hn",
  ],
  "Đà Nẵng": [
    "thanh pho da nang",
    "tp da nang",
    "tp. da nang",
    "tp.da nang",
    "da nang",
    "tpdn",
    "tp dn",
    "dn",
  ],
  "Hải Phòng": [
    "thanh pho hai phong",
    "tp hai phong",
    "tp. hai phong",
    "tp.hai phong",
    "hai phong",
    "hp",
  ],
  "Cần Thơ": [
    "thanh pho can tho",
    "tp can tho",
    "tp. can tho",
    "tp.can tho",
    "can tho",
    "ct",
  ],
  "Bình Dương": ["tinh binh duong", "binh duong", "bd"],
  "Đồng Nai": ["tinh dong nai", "dong nai", "dnai", "bien hoa"],
  "Bà Rịa - Vũng Tàu": [
    "tinh ba ria vung tau",
    "ba ria - vung tau",
    "ba ria vung tau",
    "vung tau",
    "brvt",
    "br-vt",
  ],
  "Thừa Thiên Huế": [
    "tinh thua thien hue",
    "thua thien hue",
    "thua thien - hue",
    "tt hue",
    "tt. hue",
    "hue",
  ],
  "Khánh Hòa": ["tinh khanh hoa", "khanh hoa", "nha trang"],
  "Lâm Đồng": ["tinh lam dong", "lam dong", "da lat"],
  "Quảng Ninh": ["tinh quang ninh", "quang ninh", "ha long"],
  "Kiên Giang": ["tinh kien giang", "kien giang", "phu quoc"],
  "Bắc Ninh": ["tinh bac ninh", "bac ninh"],
  "Hưng Yên": ["tinh hung yen", "hung yen"],
  "Hải Dương": ["tinh hai duong", "hai duong"],
  "Thái Nguyên": ["tinh thai nguyen", "thai nguyen"],
  "Tuyên Quang": ["tinh tuyen quang", "tuyen quang", "tq"],
  "Thanh Hóa": ["tinh thanh hoa", "thanh hoa"],
  "Nghệ An": ["tinh nghe an", "nghe an", "vinh"],
  "Bình Định": ["tinh binh dinh", "binh dinh", "quy nhon"],
  "Đắk Lắk": ["tinh dak lak", "dak lak", "daklak", "buon ma thuot", "bmt"],
  "Phú Thọ": ["tinh phu tho", "phu tho", "viet tri"],
  "Vĩnh Phúc": ["tinh vinh phuc", "vinh phuc"],
  "Bắc Giang": ["tinh bac giang", "bac giang"],
  "Hà Giang": ["tinh ha giang", "ha giang"],
  "Cao Bằng": ["tinh cao bang", "cao bang"],
  "Lạng Sơn": ["tinh lang son", "lang son"],
  "Yên Bái": ["tinh yen bai", "yen bai"],
  "Lào Cai": ["tinh lao cai", "lao cai", "sa pa"],
  "Sơn La": ["tinh son la", "son la"],
  "Điện Biên": ["tinh dien bien", "dien bien", "dien bien phu"],
  "Hòa Bình": ["tinh hoa binh", "hoa binh"],
  "Nam Định": ["tinh nam dinh", "nam dinh"],
  "Thái Bình": ["tinh thai binh", "thai binh"],
  "Hà Nam": ["tinh ha nam", "ha nam"],
  "Ninh Bình": ["tinh ninh binh", "ninh binh"],
  "Quảng Bình": ["tinh quang binh", "quang binh"],
  "Quảng Trị": ["tinh quang tri", "quang tri"],
  "Quảng Nam": ["tinh quang nam", "quang nam", "hoi an"],
  "Quảng Ngãi": ["tinh quang ngai", "quang ngai"],
  "Phú Yên": ["tinh phu yen", "phu yen"],
  "Bình Thuận": ["tinh binh thuan", "binh thuan", "phan thiet"],
  "Ninh Thuận": ["tinh ninh thuan", "ninh thuan", "phan rang"],
  "Gia Lai": ["tinh gia lai", "gia lai", "pleiku"],
  "Kon Tum": ["tinh kon tum", "kon tum"],
  "Đắk Nông": ["tinh dak nong", "dak nong"],
  "Bình Phước": ["tinh binh phuoc", "binh phuoc"],
  "Tây Ninh": ["tinh tay ninh", "tay ninh"],
  "Long An": ["tinh long an", "long an"],
  "Tiền Giang": ["tinh tien giang", "tien giang", "my tho"],
  "Bến Tre": ["tinh ben tre", "ben tre"],
  "Trà Vinh": ["tinh tra vinh", "tra vinh"],
  "Vĩnh Long": ["tinh vinh long", "vinh long"],
  "Đồng Tháp": ["tinh dong thap", "dong thap", "cao lanh"],
  "An Giang": ["tinh an giang", "an giang", "long xuyen"],
  "Hậu Giang": ["tinh hau giang", "hau giang", "vi thanh"],
  "Sóc Trăng": ["tinh soc trang", "soc trang"],
  "Bạc Liêu": ["tinh bac lieu", "bac lieu"],
  "Cà Mau": ["tinh ca mau", "ca mau"],
};

/**
 * Known Vietnamese District Capital / Town mappings
 * When a user writes "xã [Tên Huyện]" (e.g. "xã Hàm Yên"), or a district center has a different name
 */
export const DISTRICT_CAPITAL_TOWNS: Record<string, string[]> = {
  "ham yen": ["tan yen", "thi tran tan yen", "tt tan yen", "xa ham yen", "thi tran ham yen"],
  "dan phuong": ["phung", "thi tran phung", "tt phung", "thi tran dan phuong", "xa dan phuong"],
  "hoai duc": ["tram troi", "thi tran tram troi", "tt tram troi", "thi tran hoai duc"],
  "thach that": ["lien quan", "thi tran lien quan", "tt lien quan", "thi tran thach that"],
  "chuong my": ["chuc son", "thị tran chuc son", "tt chuc son", "thi tran chuong my"],
  "my duc": ["dai nghia", "thi tran dai nghia", "tt dai nghia", "thi tran my duc"],
  "thanh oai": ["kim bai", "thi tran kim bai", "tt kim bai", "thi tran thanh oai"],
  "me linh": ["quang minh", "thi tran quang minh", "chi dong", "thi tran chi dong"],
  "luc yen": ["yen the", "thi tran yen the", "tt yen the"],
  "van ban": ["khanh yen", "thi tran khanh yen", "tt khanh yen"],
  "bao thang": ["pho lu", "thi tran pho lu", "tt pho lu"],
  "bao yen": ["pho rang", "thi tran pho rang", "tt pho rang"],
  "tran yen": ["co phuc", "thi tran co phuc", "tt co phuc"],
  "van yen": ["mau a", "thi tran mau a", "tt mau a"],
  "binh luc": ["binh my", "thi tran binh my", "tt binh my"],
  "ly nhan": ["vinh tru", "thi tran vinh tru", "tt vinh tru"],
  "y yen": ["lam", "thi tran lam", "tt lam"],
  "vu ban": ["goi", "thi tran goi", "tt goi"],
  "truc ninh": ["co le", "thi tran co le", "tt co le"],
  "nghia hung": ["lieu de", "thi tran lieu de", "tt lieu de"],
  "hai hau": ["yen dinh", "thi tran yen dinh", "tt yen dinh"],
  "giao thuy": ["ngo dong", "thi tran ngo dong", "tt ngo dong"],
  "kien xuong": ["thanh ne", "thi tran thanh ne", "tt thanh ne"],
  "quynh phu": ["quynh coi", "thi tran quynh coi", "tt quynh coi"],
  "thai thuy": ["diem dien", "thi tran diem dien", "tt diem dien"],
  "thuy nguyen": ["nui deo", "thi tran nui deo", "tt nui deo"],
  "cho don": ["bang lung", "thi tran bang lung", "tt bang lung"],
  "ba be": ["cho ra", "thi tran cho ra", "tt cho ra"],
  "ngan son": ["na phac", "thi tran na phac", "tt na phac"],
};

/**
 * Known Vietnamese landmarks & Km milestones mapped to their specific Town/Ward
 */
export const LANDMARK_WARD_MAPPINGS: Array<{
  keywords: string[];
  districtKeyword?: string;
  targetWardName: string;
}> = [
  {
    keywords: ["km39", "km 39", "km38", "km 38", "km40", "km 40", "km39 ql2", "km 39 ql2"],
    districtKeyword: "ham yen",
    targetWardName: "Thị trấn Tân Yên",
  },
];

/**
 * Known Vietnamese streets mapped to specific wards in major districts
 */
export const STREET_WARD_MAPPINGS: Array<{
  streetKeywords: string[];
  districtKeyword?: string;
  targetWardName: string;
}> = [
  // Hà Nội - Quận Đống Đa
  {
    streetKeywords: ["chua lang", "pho chua lang", "duong chua lang"],
    districtKeyword: "dong da",
    targetWardName: "Phường Láng Thượng",
  },
  {
    streetKeywords: ["chua boc", "pho chua boc", "tay son"],
    districtKeyword: "dong da",
    targetWardName: "Phường Quang Trung",
  },
  {
    streetKeywords: ["thai ha", "pho thai ha"],
    districtKeyword: "dong da",
    targetWardName: "Phường Trung Liệt",
  },
  {
    streetKeywords: ["ton that tung"],
    districtKeyword: "dong da",
    targetWardName: "Phường Khương Thượng",
  },

  // Hà Nội - Quận Cầu Giấy
  {
    streetKeywords: ["dich vong hau", "duy tan", "xuan thuy", "tran thai tong", "pham hung"],
    districtKeyword: "cau giay",
    targetWardName: "Phường Dịch Vọng Hậu",
  },
  {
    streetKeywords: ["nghia tan", "to hieu"],
    districtKeyword: "cau giay",
    targetWardName: "Phường Nghĩa Tân",
  },

  // Hà Nội - Quận Thanh Xuân
  {
    streetKeywords: ["nguyen trai", "khuong dinh", "khuong trung"],
    districtKeyword: "thanh xuan",
    targetWardName: "Phường Thượng Đình",
  },

  // Đà Nẵng - Quận Liên Chiểu
  {
    streetKeywords: ["nguyen van cu", "k282 nguyen van cu", "kiet 282 nguyen van cu"],
    districtKeyword: "lien chieu",
    targetWardName: "Phường Hòa Hiệp Bắc",
  },
  {
    streetKeywords: ["nguyen luong bang", "ton duc thang", "ngo thi nham"],
    districtKeyword: "lien chieu",
    targetWardName: "Phường Hòa Khánh Bắc",
  },
  {
    streetKeywords: ["hoang thi loan", "kinh duong vuong", "dong ke"],
    districtKeyword: "lien chieu",
    targetWardName: "Phường Hòa Minh",
  },
  {
    streetKeywords: ["nam cao", "pham nhu xuong"],
    districtKeyword: "lien chieu",
    targetWardName: "Phường Hòa Khánh Nam",
  },
  {
    streetKeywords: ["me linh", "nguyen tat thanh noi dai"],
    districtKeyword: "lien chieu",
    targetWardName: "Phường Hòa Hiệp Nam",
  },
];

/**
 * Standardize phone number format (returns 10 digits starting with 0, or empty string)
 */
export function extractPhoneNumber(text: string): { phone: string; rawPhone: string; remainingText: string } {
  const phoneRegex = /(?:\+?84|0)[\s.-]?[3|5|7|8|9](?:[\s.-]?\d){8}\b/;
  const match = text.match(phoneRegex);

  if (!match) {
    const fallbackRegex = /\b0\d{9}\b/;
    const fallbackMatch = text.match(fallbackRegex);
    if (fallbackMatch) {
      const phone = fallbackMatch[0];
      const remaining = text.replace(fallbackMatch[0], " ").trim();
      return { phone, rawPhone: fallbackMatch[0], remainingText: remaining };
    }
    return { phone: "", rawPhone: "", remainingText: text };
  }

  const rawPhone = match[0];
  const digits = rawPhone.replace(/\D/g, "");
  let cleanPhone = digits;
  if (digits.startsWith("84")) {
    cleanPhone = "0" + digits.slice(2);
  } else if (!digits.startsWith("0")) {
    cleanPhone = "0" + digits;
  }

  const remainingText = text.replace(rawPhone, " ").trim();
  return { phone: cleanPhone, rawPhone, remainingText };
}

/**
 * Address-related keywords that must NOT be contained within a person's name
 */
const ADDRESS_KEYWORD_REGEX =
  /(?:^|\s)(số|so|duong|đường|ngõ|ngo|ngach|ngách|hem|hẻm|phuong|phường|xa|xã|quan|quận|huyen|huyện|tinh|tỉnh|thành phố|thanh pho|tp|p\.|q\.|h\.|t\.|thon|thôn|xom|xóm|ap|ấp|to|tổ|doi|đội|khu|khu pho|khu phố|kp|thi tran|thị trấn|chung cu|chung cư|toa nha|tòa nhà|tang|tầng|toa|toà|dc|đc|dia chi|địa chỉ|add|address|sdt|sđt|so dt|số đt|so dien thoai|số điện thoại|phone|tel|hotline|kiet|kiệt|km\s*\d+)(?:\s|$|[:：,\-.])/i;

const BLACKLISTED_NAME_WORDS = new Set([
  "sdt",
  "sđt",
  "tel",
  "phone",
  "hotline",
  "dt",
  "đt",
  "so dt",
  "số đt",
  "so dien thoai",
  "số điện thoại",
  "dc",
  "đc",
  "dia chi",
  "địa chỉ",
  "add",
  "address",
  "ten",
  "tên",
  "kh",
  "khach",
  "khach hang",
  "khách hàng",
  "nguoi nhan",
  "người nhận",
  "receiver",
  "name",
]);

/**
 * Check if a candidate string can be a person name
 */
export function isPotentialPersonName(candidate: string): boolean {
  const trimmed = candidate.trim().replace(/^[:：\-.,\s"'“”«»]+|[:：\-.,\s"'“”«»]+$/g, "");
  if (!trimmed || trimmed.length < 2 || trimmed.length > 40) return false;

  // Must not have digits
  if (/\d/.test(trimmed)) return false;

  // Must not contain hyphens/dashes connecting words (e.g. "lưu giáo -kim bang-hà")
  if (/[-–—]/.test(trimmed)) return false;

  const norm = normalizeText(trimmed);

  // Must not be a phone or address label keyword
  if (BLACKLISTED_NAME_WORDS.has(norm) || BLACKLISTED_NAME_WORDS.has(removeVietnameseAccents(norm))) {
    return false;
  }

  // Must not contain any address keywords (checked both with and without accents)
  if (ADDRESS_KEYWORD_REGEX.test(trimmed)) return false;
  if (ADDRESS_KEYWORD_REGEX.test(removeVietnameseAccents(trimmed))) return false;

  // Must not contain any province name or alias (with whole word boundaries)
  for (const [provName, aliases] of Object.entries(PROVINCE_ALIASES)) {
    const normProv = normalizeText(provName);
    if (
      norm === normProv ||
      norm.startsWith(`${normProv} `) ||
      norm.endsWith(` ${normProv}`) ||
      norm.includes(` ${normProv} `)
    ) {
      return false;
    }
    for (const a of aliases) {
      const normA = normalizeText(a);
      if (
        norm === normA ||
        norm.startsWith(`${normA} `) ||
        norm.endsWith(` ${normA}`) ||
        norm.includes(` ${normA} `)
      ) {
        return false;
      }
    }
  }

  // Must not contain only non-letter characters
  if (!/[a-zA-ZÀ-ỹ]/.test(trimmed)) return false;

  // Words count should be between 1 and 6 words
  const words = trimmed.split(/\s+/);
  if (words.length > 6) return false;

  return true;
}

/**
 * Helper to generate regex search variations for District names
 */
function getDistrictPatterns(districtName: string): string[] {
  const norm = normalizeText(districtName);
  const stripped = norm.replace(/^(quan|q|huyen|h|thi xa|tx|thanh pho|tp)\s+/gi, "").trim();
  const isPureNumber = /^\d+$/.test(stripped);

  const patterns = new Set<string>();
  patterns.add(norm);

  if (isPureNumber) {
    const num = parseInt(stripped, 10);
    const numStr = String(num);
    const numPad = num < 10 ? `0${num}` : numStr;

    patterns.add(`quan ${numStr}`);
    patterns.add(`quan ${numPad}`);
    patterns.add(`quan${numStr}`);
    patterns.add(`quan${numPad}`);
    patterns.add(`q${numStr}`);
    patterns.add(`q${numPad}`);
    patterns.add(`q ${numStr}`);
    patterns.add(`q ${numPad}`);
    patterns.add(`q.${numStr}`);
    patterns.add(`q.${numPad}`);
    patterns.add(`q. ${numStr}`);
    patterns.add(`q. ${numPad}`);
  } else if (stripped && stripped !== norm) {
    patterns.add(stripped);
    patterns.add(`quan ${stripped}`);
    patterns.add(`q ${stripped}`);
    patterns.add(`q.${stripped}`);
    patterns.add(`huyen ${stripped}`);
    patterns.add(`h ${stripped}`);
    patterns.add(`h.${stripped}`);
    patterns.add(`tx ${stripped}`);
    patterns.add(`tx.${stripped}`);
    patterns.add(`tp ${stripped}`);
    patterns.add(`tp.${stripped}`);
    patterns.add(`thanh pho ${stripped}`);
  }

  // Special case: Thành phố Thủ Đức
  if (norm.includes("thu duc")) {
    patterns.add("thu duc");
    patterns.add("tp thu duc");
    patterns.add("tp.thu duc");
    patterns.add("tp. thu duc");
    patterns.add("thanh pho thu duc");
    patterns.add("quan thu duc");
  }

  // Sort longest patterns first so more specific matches win
  return Array.from(patterns).sort((a, b) => b.length - a.length);
}

/**
 * Helper to generate regex search variations for Ward names
 */
function getWardPatterns(wardName: string, requirePrefix = false): string[] {
  const norm = normalizeText(wardName);
  const stripped = norm.replace(/^(phuong|p|xa|x|thi tran|tt)\s+/gi, "").trim();
  const isPureNumber = /^\d+$/.test(stripped);

  const patterns = new Set<string>();

  if (!requirePrefix) {
    patterns.add(norm);
  }

  if (isPureNumber) {
    const num = parseInt(stripped, 10);
    const numStr = String(num);
    const numPad = num < 10 ? `0${num}` : numStr;

    // Numeric wards ALWAYS require prefix to avoid clash with house numbers
    patterns.add(`phuong ${numStr}`);
    patterns.add(`phuong ${numPad}`);
    patterns.add(`phuong${numStr}`);
    patterns.add(`phuong${numPad}`);
    patterns.add(`p${numStr}`);
    patterns.add(`p${numPad}`);
    patterns.add(`p ${numStr}`);
    patterns.add(`p ${numPad}`);
    patterns.add(`p.${numStr}`);
    patterns.add(`p.${numPad}`);
    patterns.add(`p. ${numStr}`);
    patterns.add(`p. ${numPad}`);
    patterns.add(`f${numStr}`);
    patterns.add(`f${numPad}`);
    patterns.add(`f ${numStr}`);
    patterns.add(`f.${numStr}`);
    patterns.add(`f. ${numStr}`);
    patterns.add(`xa ${numStr}`);
    patterns.add(`x${numStr}`);
    patterns.add(`x ${numStr}`);
    patterns.add(`x.${numStr}`);
  } else if (stripped && stripped !== norm) {
    patterns.add(`phuong ${stripped}`);
    patterns.add(`p ${stripped}`);
    patterns.add(`p.${stripped}`);
    patterns.add(`xa ${stripped}`);
    patterns.add(`x ${stripped}`);
    patterns.add(`x.${stripped}`);
    patterns.add(`thi tran ${stripped}`);
    patterns.add(`tt ${stripped}`);
    patterns.add(`tt.${stripped}`);
    if (!requirePrefix) {
      patterns.add(stripped);
    }
  }

  return Array.from(patterns).sort((a, b) => b.length - a.length);
}

export interface ParsedAddressResult {
  customerName: string;
  customerPhone: string;
  detailAddress: string;
  provinceId?: number;
  provinceName?: string;
  districtId?: number;
  districtName?: string;
  wardCode?: string;
  wardName?: string;
  unmatchedWardCandidate?: string;
  warningMessage?: string;
  is2LevelConverted?: boolean;
  confidence: number;
}

/**
 * Escape special regex characters in string
 */
function escapeRegex(string: string) {
  return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&");
}

/**
 * Helper to match pattern as a discrete word token in normalized text
 */
function findPatternMatch(
  text: string,
  patterns: string[]
): { pattern: string; index: number; length: number } | null {
  const normText = normalizeText(text);

  for (const pattern of patterns) {
    const normPattern = normalizeText(pattern);
    if (!normPattern) continue;

    const regex = new RegExp(`(?:^|\\s)${escapeRegex(normPattern)}(?:$|\\s)`, "i");
    const match = normText.match(regex);
    if (match && typeof match.index === "number") {
      const matchIndex = match.index + (match[0].startsWith(" ") ? 1 : 0);
      return {
        pattern: normPattern,
        index: matchIndex,
        length: normPattern.length,
      };
    }
  }

  return null;
}

function makeDiacriticRegex(strNoAccents: string): RegExp {
  const diacriticMap: Record<string, string> = {
    a: "[aáàảãạăắằẳẵặâấầẩẫậAÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬ]",
    e: "[eéèẻẽẹêếềểễệEÉÈẺẼẸÊẾỀỂỄỆ]",
    i: "[iíìỉĩịIÍÌỈĨỊ]",
    o: "[oóòỏõọôốồổỗộơớờởỡợOÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢ]",
    u: "[uúùủũụưứừửữựUÚÙỦŨỤƯỨỪỬỮỰ]",
    y: "[yýỳỷỹỵYÝỲỶỸỴ]",
    d: "[dđDĐ]",
  };

  const pattern = strNoAccents
    .trim()
    .split(/\s+/)
    .map((word) =>
      word
        .split("")
        .map((c) => diacriticMap[c.toLowerCase()] || escapeRegex(c))
        .join("[\\s.]*")
    )
    .join("[\\s.,-]+");

  return new RegExp(`(?:^|[\\s,;:\\-–—"'“”«»()\\[\\]{}])${pattern}(?:$|[\\s,;:\\-–—"'“”«»()\\[\\]{}])`, "gi");
}

/**
 * Smart Customer & Address Parser
 * Seamlessly parses unpunctuated single-line, comma-separated, multi-line, 2-level and 3-level addresses!
 */
export async function parseCustomerAndAddress(
  rawInput: string,
  provinces: GhnProvince[],
  loadDistricts: (provinceId: number) => Promise<GhnDistrict[]>,
  loadWards: (districtId: number) => Promise<GhnWard[]>
): Promise<ParsedAddressResult> {
  if (!rawInput.trim()) {
    return {
      customerName: "",
      customerPhone: "",
      detailAddress: "",
      confidence: 0,
    };
  }

  // 1. Extract phone number
  const { phone, rawPhone, remainingText } = extractPhoneNumber(rawInput);

  let workingText = remainingText.trim();
  let customerName = "";

  // 2. Extract Customer Name from explicit name labels
  const nameLabelRegex = /(?:tên|ten|họ và tên|ho va ten|họ tên|ho ten|người nhận|nguoi nhan|khách hàng|khach hang|tên khách|ten khach|name|receiver)\s*[:：\-]\s*([^\r\n,;|\t]+)/i;
  const nameLabelMatch = rawInput.match(nameLabelRegex);

  if (nameLabelMatch && isPotentialPersonName(nameLabelMatch[1])) {
    customerName = nameLabelMatch[1].trim().replace(/^[:：\-.,\s]+|[:：\-.,\s]+$/g, "");
    workingText = workingText.replace(nameLabelMatch[0], " ").trim();
  }

  // 3. Match Province
  let matchedProvince: GhnProvince | undefined;
  let matchedProvincePattern = "";

  for (const p of provinces) {
    const aliases = PROVINCE_ALIASES[p.ProvinceName] || [];
    const patterns = [p.ProvinceName, ...aliases].sort((a, b) => b.length - a.length);

    const match = findPatternMatch(workingText, patterns);
    if (match) {
      if (!matchedProvince || match.pattern.length > matchedProvincePattern.length) {
        matchedProvince = p;
        matchedProvincePattern = match.pattern;
      }
    }
  }

  let matchedDistrict: GhnDistrict | undefined;
  let matchedDistrictPattern = "";
  let matchedWard: GhnWard | undefined;
  let matchedWardPattern = "";
  let is2LevelConverted = false;

  let textAfterProvince = workingText;
  if (matchedProvince && matchedProvincePattern) {
    const regex = makeDiacriticRegex(matchedProvincePattern);
    textAfterProvince = workingText.replace(regex, " ").replace(/\s+/g, " ").trim();
  }

  if (matchedProvince) {
    const districts = await loadDistricts(matchedProvince.ProvinceID);

    // 4. Match District
    for (const d of districts) {
      const patterns = getDistrictPatterns(d.DistrictName);
      const match = findPatternMatch(textAfterProvince, patterns);
      if (match) {
        if (!matchedDistrict || match.pattern.length > matchedDistrictPattern.length) {
          matchedDistrict = d;
          matchedDistrictPattern = match.pattern;
        }
      }
    }

    let textAfterDistrict = textAfterProvince;
    if (matchedDistrict && matchedDistrictPattern) {
      const regex = makeDiacriticRegex(matchedDistrictPattern);
      textAfterDistrict = textAfterProvince.replace(regex, " ").replace(/\s+/g, " ").trim();
    }

    // 5. Match Ward
    if (matchedDistrict) {
      const wards = await loadWards(matchedDistrict.DistrictID);

      const normInput = normalizeText(rawInput);
      const normDist = normalizeText(matchedDistrict.DistrictName);
      const strippedDist = normDist.replace(/^(quan|q|huyen|h|thi xa|tx|thanh pho|tp)\s+/gi, "").trim();

      // (A) Check Street Mappings (e.g. Nguyễn Văn Cừ -> Phường Hòa Hiệp Bắc, Liên Chiểu)
      for (const sm of STREET_WARD_MAPPINGS) {
        const distMatches = !sm.districtKeyword || normDist.includes(sm.districtKeyword);
        if (distMatches) {
          const streetMatches = sm.streetKeywords.some((k) => normInput.includes(normalizeText(k)));
          if (streetMatches) {
            const target = wards.find((w) => normalizeText(w.WardName).includes(normalizeText(sm.targetWardName)));
            if (target) {
              matchedWard = target;
              matchedWardPattern = target.WardName;
              break;
            }
          }
        }
      }

      // (B) Check Landmark / Km Milestone Mappings (e.g. Km39 -> Thị trấn Tân Yên)
      if (!matchedWard) {
        for (const lm of LANDMARK_WARD_MAPPINGS) {
          const distMatches = !lm.districtKeyword || normDist.includes(lm.districtKeyword);
          if (distMatches) {
            const keywordMatches = lm.keywords.some((k) => normInput.includes(normalizeText(k)));
            if (keywordMatches) {
              const target = wards.find((w) => normalizeText(w.WardName).includes(normalizeText(lm.targetWardName)));
              if (target) {
                matchedWard = target;
                matchedWardPattern = target.WardName;
                break;
              }
            }
          }
        }
      }

      // (C) First try: match on text AFTER district removal
      if (!matchedWard) {
        for (const w of wards) {
          const patterns = getWardPatterns(w.WardName);
          const match = findPatternMatch(textAfterDistrict, patterns);
          if (match) {
            if (!matchedWard || match.pattern.length > matchedWardPattern.length) {
              matchedWard = w;
              matchedWardPattern = match.pattern;
            }
          }
        }
      }

      // (D) Fallback: if no ward found, check District Capital Town aliases
      if (!matchedWard) {
        const townAliases = DISTRICT_CAPITAL_TOWNS[strippedDist] || [];
        
        if (townAliases.length > 0) {
          const userMentionedTownOrDistrict =
            townAliases.some((alias) => normInput.includes(alias)) ||
            normInput.includes(`xa ${strippedDist}`) ||
            normInput.includes(`thi tran ${strippedDist}`) ||
            normInput.includes(`phuong ${strippedDist}`);

          if (userMentionedTownOrDistrict) {
            const townWard = wards.find((w) => {
              const normW = normalizeText(w.WardName);
              return townAliases.some((alias) => normW.includes(alias)) || normW.startsWith("thi tran");
            });

            if (townWard) {
              matchedWard = townWard;
              matchedWardPattern = `xa ${strippedDist}`;
            }
          }
        }
      }

      // (E) Fallback: User wrote "Phường [Tên Quận]" without mentioning a specific ward
      if (!matchedWard && (normInput.includes(`phuong ${strippedDist}`) || normInput.includes(`p ${strippedDist}`))) {
        if (wards.length > 0) {
          matchedWard = wards[0];
          matchedWardPattern = `phuong ${strippedDist}`;
        }
      }

      // (F) Fallback: Prefix-required match on text before district removal
      if (!matchedWard) {
        for (const w of wards) {
          const patterns = getWardPatterns(w.WardName, true);
          const match = findPatternMatch(textAfterProvince, patterns);
          if (match) {
            if (!matchedWard || match.pattern.length > matchedWardPattern.length) {
              matchedWard = w;
              matchedWardPattern = match.pattern;
            }
          }
        }
      }
    } else {
      // 2-LEVEL RESOLVER
      // 1. First check street mappings across all districts in the province (e.g. Chùa Láng -> Đống Đa -> Láng Thượng)
      const normInput = normalizeText(rawInput);
      for (const dist of districts) {
        const normDist = normalizeText(dist.DistrictName);
        for (const sm of STREET_WARD_MAPPINGS) {
          const distMatches = !sm.districtKeyword || normDist.includes(sm.districtKeyword);
          if (distMatches) {
            const streetMatches = sm.streetKeywords.some((k) => normInput.includes(normalizeText(k)));
            if (streetMatches) {
              const wards = await loadWards(dist.DistrictID);
              const target = wards.find((w) => normalizeText(w.WardName).includes(normalizeText(sm.targetWardName)));
              if (target) {
                matchedWard = target;
                matchedWardPattern = target.WardName;
                matchedDistrict = dist;
                matchedDistrictPattern = "";
                is2LevelConverted = true;
                break;
              }
            }
          }
        }
        if (matchedWard) break;
      }

      // 2. If not found via street mappings, search across wards of all districts in this province
      if (!matchedWard) {
        for (const dist of districts) {
          const wards = await loadWards(dist.DistrictID);
          for (const w of wards) {
            const patterns = getWardPatterns(w.WardName);
            const match = findPatternMatch(textAfterDistrict, patterns);
            if (match) {
              if (!matchedWard || match.pattern.length > matchedWardPattern.length) {
                matchedWard = w;
                matchedWardPattern = match.pattern;
                matchedDistrict = dist;
                matchedDistrictPattern = "";
                is2LevelConverted = true;
              }
            }
          }
        }
      }
    }
  }

  // 6. Extract Customer Name (if not already extracted by explicit label)
  if (!customerName) {
    // 6A. Check after phone number on the SAME LINE: e.g. "sđt: 0941465476 Thảo Nguyên"
    if (rawPhone) {
      const afterPhoneRegex = new RegExp(`${escapeRegex(rawPhone)}[ \\t,;:\\-]+([^\\r\\n,;|\\t]+)`, "i");
      const afterMatch = rawInput.match(afterPhoneRegex);
      if (afterMatch) {
        const candidateWords = afterMatch[1].trim().split(/\s+/);
        for (let len = Math.min(candidateWords.length, 4); len >= 1; len--) {
          const cand = candidateWords.slice(0, len).join(" ");
          if (isPotentialPersonName(cand)) {
            customerName = cand;
            break;
          }
        }
      }
    }

    // 6B. Check between last administrative unit and phone: e.g. "... Đà Nẵng Nguyên Sđt 0905257843"
    if (!customerName && rawPhone && matchedProvincePattern) {
      const provRegex = new RegExp(makeDiacriticRegex(matchedProvincePattern).source, "i");
      const provMatch = provRegex.exec(rawInput);
      const phoneLabelRegex = new RegExp(`(?:(?:sđt|sdt|số đt|so dt|số điện thoại|so dien thoai|phone|tel|hotline)\\s*[:：\\-]?\\s*)?${escapeRegex(rawPhone)}`, "i");
      const phoneMatch = phoneLabelRegex.exec(rawInput);

      if (provMatch && phoneMatch && typeof provMatch.index === "number" && typeof phoneMatch.index === "number") {
        const endOfProv = provMatch.index + provMatch[0].length;
        const startOfPhone = phoneMatch.index;

        if (startOfPhone > endOfProv) {
          const betweenText = rawInput.slice(endOfProv, startOfPhone).trim().replace(/^[:：\-.,\s]+|[:：\-.,\s]+$/g, "");
          if (betweenText && isPotentialPersonName(betweenText)) {
            customerName = betweenText;
          }
        }
      }
    }

    // 6C. Check before phone number at the beginning: e.g. "Nguyen Van A, 0908888888, 12 Le Duan..."
    if (!customerName && rawPhone) {
      const beforePhoneMatch = rawInput.match(new RegExp(`^\\s*([A-ZÀ-Ỹa-zà-ỹ\\s]{2,35})[\\s,;:\\-]+${escapeRegex(rawPhone)}`, "i"));
      if (beforePhoneMatch && isPotentialPersonName(beforePhoneMatch[1])) {
        customerName = beforePhoneMatch[1].trim().replace(/^[:：\-.,\s]+|[:：\-.,\s]+$/g, "");
      }
    }

    // 6D. Check multi-line format
    if (!customerName) {
      const lines = workingText
        .split(/[\r\n]+/)
        .map((t) => t.trim().replace(/^[:：\-.,\s]+|[:：\-.,\s]+$/g, ""))
        .filter((t) => t.length > 0);

      if (lines.length > 1) {
        if (isPotentialPersonName(lines[0])) {
          customerName = lines[0];
        } else if (isPotentialPersonName(lines[lines.length - 1])) {
          customerName = lines[lines.length - 1];
        }
      }
    }
  }

  // 8. Build detailAddress by stripping all known parts from original input
  let detailAddress = rawInput;

  // Strip phone number
  if (rawPhone) {
    detailAddress = detailAddress.replace(rawPhone, " ");
  }

  // Strip customer name (preserve accented street names like 'Nguyễn' when name is 'Nguyên')
  if (customerName) {
    const exactNameRegex = new RegExp(`(?:^|[\\s,;\\-])${escapeRegex(customerName)}(?:$|[\\s,;\\-])`, "gi");
    if (exactNameRegex.test(detailAddress)) {
      detailAddress = detailAddress.replace(exactNameRegex, " ");
    } else {
      const nameRegex = makeDiacriticRegex(removeVietnameseAccents(customerName));
      detailAddress = detailAddress.replace(nameRegex, " ");
    }
  }

  // Strip matched administrative units
  if (matchedProvincePattern) {
    const reg = makeDiacriticRegex(matchedProvincePattern);
    detailAddress = detailAddress.replace(reg, " ");
  }
  if (matchedDistrictPattern) {
    const reg = makeDiacriticRegex(matchedDistrictPattern);
    detailAddress = detailAddress.replace(reg, " ");
  }
  if (matchedWardPattern) {
    const normDetail = normalizeText(detailAddress);
    const normWard = normalizeText(matchedWardPattern);
    const strippedWard = normWard.replace(/^(phuong|xa|thi tran|p|tt)\s+/i, "").trim();

    // Check if user explicitly wrote "phường/xã/thị trấn" before the ward name in their input
    const hasExplicitWardPrefix =
      normDetail.includes(`phuong ${strippedWard}`) ||
      normDetail.includes(`p ${strippedWard}`) ||
      normDetail.includes(`xa ${strippedWard}`) ||
      normDetail.includes(`thi tran ${strippedWard}`) ||
      /^p\d+$/i.test(matchedWardPattern);

    // Check if the ward name is preceded by an alley keyword (ngõ, ngách, hẻm, kiệt)
    const wardIndex = normDetail.indexOf(strippedWard);
    const textBeforeWard = wardIndex > 0 ? normDetail.slice(0, wardIndex).trim() : "";
    const isPartOfAlleyAddress = /(?:^|\s)(?:ngo|ngach|hem|kiet)\s+\d+/i.test(textBeforeWard);

    // If it's part of an alley address and user did NOT write explicit "phường", keep the street name in detailAddress
    if (!isPartOfAlleyAddress || hasExplicitWardPrefix) {
      const reg = makeDiacriticRegex(matchedWardPattern);
      detailAddress = detailAddress.replace(reg, " ");
      if (strippedWard !== normWard) {
        const regStripped = makeDiacriticRegex(strippedWard);
        detailAddress = detailAddress.replace(regStripped, " ");
      }
    }
  }

  // Strip extra mention of "phường/xã/thị trấn [huyện/quận]"
  if (matchedDistrict) {
    const distNorm = normalizeText(matchedDistrict.DistrictName).replace(/^(quan|q|huyen|h|thi xa|tx|thanh pho|tp)\s+/gi, "").trim();
    const regPhuongHuyen = makeDiacriticRegex(`phuong ${distNorm}`);
    detailAddress = detailAddress.replace(regPhuongHuyen, " ");
    const regXaHuyen = makeDiacriticRegex(`xa ${distNorm}`);
    detailAddress = detailAddress.replace(regXaHuyen, " ");
    const regTtHuyen = makeDiacriticRegex(`thi tran ${distNorm}`);
    detailAddress = detailAddress.replace(regTtHuyen, " ");
  }

  // Strip label prefixes (đc:, sđt:, tên:, địa chỉ:, etc.)
  const labelPatterns = [
    /(?:^|[\s,;"'“”«»\-])(?:đc|dc|đ\/c|địa chỉ|dia chi|add|address)\s*[:：\-]*/gi,
    /(?:^|[\s,;"'“”«»\-])(?:sđt|sdt|số đt|so dt|số điện thoại|so dien thoai|phone|tel|hotline)\s*[:：\-]*/gi,
    /(?:^|[\s,;"'“”«»\-])(?:tên|ten|họ tên|ho ten|họ và tên|người nhận|nguoi nhan|khách hàng|khach hang|tên khách|ten khach)\s*[:：\-]*/gi,
    /(?:^|[\s,;"'“”«»\-])(?:kh|name|receiver)\s*[:：\-]+/gi,
  ];
  for (const lp of labelPatterns) {
    detailAddress = detailAddress.replace(lp, " ");
  }

  // Strip orphan administrative prefixes left behind
  detailAddress = detailAddress.replace(
    /(?:^|(?<=[\s,;]))(tỉnh|tinh|thành phố|thanh pho|quận|quan|huyện|huyen|phường|phuong|xã(?!\s*\w)|thị trấn|thi tran)\s*(?=[,;:\s]|$)/gi,
    " "
  );

  // Clean up
  detailAddress = detailAddress
    .replace(/^[-–—,"'“”«»\s:]+|[-–—,"'“”«»\s:]+$/g, "")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s{2,}/g, " ")
    .trim();

  customerName = customerName
    .replace(/^[-–—,"'“”«»\s:]+|[-–—,"'“”«»\s:]+$/g, "")
    .trim();

  let unmatchedWardCandidate: string | undefined;
  let warningMessage: string | undefined;

  if (matchedDistrict && !matchedWard) {
    const explicitWardRegex = /\b(?:phường|phuong|p\.?|f\.?|xã|xa|x\.?|thị trấn|thi tran|tt\.?)\s*(\d{1,3}|[A-ZÀ-Ỹa-zà-ỹ\s]{2,25})\b/i;
    const wardMatch = rawInput.match(explicitWardRegex);
    if (wardMatch) {
      unmatchedWardCandidate = wardMatch[0].trim();
      warningMessage = `Không tìm thấy "${wardMatch[0].trim()}" trong ${matchedDistrict.DistrictName}, ${matchedProvince?.ProvinceName || ""}. Vui lòng chọn Phường / Xã chính xác.`;
    } else {
      warningMessage = `Chưa tìm thấy Phường/Xã trong ${matchedDistrict.DistrictName}, ${matchedProvince?.ProvinceName || ""}. Vui lòng chọn Phường / Xã thủ công.`;
    }
  }

  let confidence = 0.3;
  if (phone) confidence += 0.2;
  if (customerName) confidence += 0.1;
  if (matchedProvince) confidence += 0.15;
  if (matchedDistrict) confidence += 0.15;
  if (matchedWard) confidence += 0.1;

  return {
    customerName,
    customerPhone: phone,
    detailAddress,
    provinceId: matchedProvince?.ProvinceID,
    provinceName: matchedProvince?.ProvinceName,
    districtId: matchedDistrict?.DistrictID,
    districtName: matchedDistrict?.DistrictName,
    wardCode: matchedWard?.WardCode,
    wardName: matchedWard?.WardName,
    unmatchedWardCandidate,
    warningMessage,
    is2LevelConverted,
    confidence: Math.min(1.0, confidence),
  };
}

/**
 * 2-Level to 3-Level Administrative Unit Mapper
 */
export function resolve2LevelTo3Level(
  provinceId: number,
  wardCode: string,
  allWardsInProvince: Array<GhnWard & { districtName?: string }>
): {
  districtId?: number;
  wardCode: string;
  wardName?: string;
  districtName?: string;
} | null {
  const target = allWardsInProvince.find((w) => w.WardCode === wardCode);
  if (!target) return null;

  return {
    districtId: target.DistrictID,
    wardCode: target.WardCode,
    wardName: target.WardName,
    districtName: target.districtName,
  };
}
