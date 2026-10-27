import { apiRequest } from "./api-client";
import type { GhnDistrict, GhnProvince, GhnWard } from "./ghn-api";
import {
  normalizeText,
  parseCustomerAndAddress,
  type ParsedCustomerAddressResult,
} from "./vn-address-parser";
import {
  parseProductList,
  type ParsedProductItem,
  type ParsedProductListResult,
} from "./product-parser";
import type { Book, OrderLine } from "@/types";
import type { ProductLine } from "@/components/inventory/product-lines";

export interface GeminiParsedAddressApi {
  customerName?: string;
  phone?: string;
  province?: string;
  district?: string;
  ward?: string;
  detailAddress?: string;
}

export interface GeminiParsedProductsApi {
  items: Array<{
    bookId: string | null;
    bookTitle: string;
    quantity: number;
    originalText: string;
  }>;
  unmatched: string[];
}

export interface HybridAddressResult extends ParsedCustomerAddressResult {
  isAiParsed?: boolean;
}

export interface HybridProductResult extends ParsedProductListResult {
  isAiParsed?: boolean;
}

/**
 * Fuzzy match a string query with a list of items using normalized text
 */
function findBestMatch<T>(
  query: string,
  items: T[],
  getName: (item: T) => string,
): T | undefined {
  if (!query || !items || !items.length) return undefined;
  const normQuery = normalizeText(query);
  if (!normQuery) return undefined;

  // 1. Exact normalized match
  const exact = items.find((item) => normalizeText(getName(item)) === normQuery);
  if (exact) return exact;

  // 2. Contains match (either item contains query or query contains item)
  const contains = items.find((item) => {
    const normName = normalizeText(getName(item));
    return normName.includes(normQuery) || normQuery.includes(normName);
  });
  if (contains) return contains;

  // 3. Word-by-word token overlap
  const queryTokens = normQuery.split(/\s+/).filter(Boolean);
  let bestItem: T | undefined = undefined;
  let maxScore = 0;

  for (const item of items) {
    const normName = normalizeText(getName(item));
    const nameTokens = normName.split(/\s+/).filter(Boolean);
    let matchCount = 0;
    for (const t of queryTokens) {
      if (nameTokens.includes(t)) matchCount++;
    }
    const score = matchCount / Math.max(queryTokens.length, nameTokens.length);
    if (score > maxScore && score >= 0.5) {
      maxScore = score;
      bestItem = item;
    }
  }

  return bestItem;
}

/**
 * Phân tích địa chỉ và thông tin khách hàng bằng Gemini AI, tự động khớp với mã GHN.
 * Nếu Gemini gặp lỗi hoặc mất mạng, tự động fallback sang bộ phân tích cú pháp local.
 */
export async function geminiParseCustomerAndAddress(
  rawText: string,
  provinces: GhnProvince[],
  getDistricts: (provinceId: number) => Promise<GhnDistrict[]>,
  getWards: (districtId: number) => Promise<GhnWard[]>,
): Promise<HybridAddressResult> {
  try {
    const res: any = await apiRequest("/api/assistant/parse-address", {
      method: "POST",
      body: JSON.stringify({ text: rawText }),
    });

    const aiData: GeminiParsedAddressApi | undefined =
      res?.data?.customerName !== undefined || res?.data?.province !== undefined
        ? res.data
        : res?.customerName !== undefined || res?.province !== undefined
        ? res
        : res?.data?.data !== undefined
        ? res.data.data
        : undefined;

    if (aiData) {
      let matchedProvince: GhnProvince | undefined;
      let matchedDistrict: GhnDistrict | undefined;
      let matchedWard: GhnWard | undefined;

      // 1. Khớp Tỉnh/Thành phố
      if (aiData.province && provinces && provinces.length > 0) {
        matchedProvince = findBestMatch(aiData.province, provinces, (p) => p.ProvinceName);
      }

      // 2. Khớp Quận/Huyện
      if (matchedProvince && aiData.district) {
        try {
          const districts = await getDistricts(matchedProvince.ProvinceID);
          matchedDistrict = findBestMatch(aiData.district, districts, (d) => d.DistrictName);

          // 3. Khớp Phường/Xã
          if (matchedDistrict && aiData.ward) {
            const wards = await getWards(matchedDistrict.DistrictID);
            matchedWard = findBestMatch(aiData.ward, wards, (w) => w.WardName);
          }
        } catch (fetchErr) {
          console.warn("Lỗi tải quận/phường khi khớp AI:", fetchErr);
        }
      }

      return {
        customerName: aiData.customerName || undefined,
        customerPhone: aiData.phone || undefined,
        provinceId: matchedProvince?.ProvinceID,
        provinceName: matchedProvince?.ProvinceName || aiData.province || undefined,
        districtId: matchedDistrict?.DistrictID,
        districtName: matchedDistrict?.DistrictName || aiData.district || undefined,
        wardCode: matchedWard?.WardCode,
        wardName: matchedWard?.WardName || aiData.ward || undefined,
        detailAddress: aiData.detailAddress || undefined,
        isAiParsed: true,
      };
    }
  } catch (error) {
    console.warn("Gemini parse address failed, falling back to local parser:", error);
  }

  // Fallback: Chạy bộ phân tích cú pháp local
  const localResult = await parseCustomerAndAddress(
    rawText,
    provinces,
    getDistricts,
    getWards,
  );
  return { ...localResult, isAiParsed: false };
}

/**
 * Phân tích danh sách sản phẩm bằng Gemini AI kết hợp danh mục sách trong kho.
 * Nếu Gemini gặp lỗi hoặc mất mạng, tự động fallback sang bộ phân tích cú pháp local.
 */
export async function geminiParseProducts(
  rawText: string,
  books: Book[],
): Promise<HybridProductResult> {
  try {
    const compactBooks = books.map((b) => ({
      id: String(b.id),
      title: b.title,
    }));

    const res: any = await apiRequest("/api/assistant/parse-products", {
      method: "POST",
      body: JSON.stringify({
        text: rawText,
        books: compactBooks,
      }),
    });

    const aiData: GeminiParsedProductsApi | undefined =
      Array.isArray(res?.data?.items)
        ? res.data
        : Array.isArray(res?.items)
        ? res
        : Array.isArray(res?.data?.data?.items)
        ? res.data.data
        : undefined;

    if (aiData && aiData.items.length > 0) {
      const lineMap = new Map<string, { quantity: number; price: number }>();
      const matchedItems: ParsedProductItem[] = [];
      const unmatchedTokens: string[] = Array.isArray(aiData.unmatched) ? [...aiData.unmatched] : [];

      for (const item of aiData.items) {
        let matchedBook: Book | undefined;

        if (item.bookId) {
          matchedBook = books.find((b) => String(b.id) === String(item.bookId));
        }

        if (!matchedBook && item.bookTitle) {
          matchedBook = findBestMatch(item.bookTitle, books, (b) => b.title);
        }

        if (matchedBook) {
          const qty = Math.max(1, Math.round(item.quantity || 1));
          const bookIdStr = String(matchedBook.id);

          const existing = lineMap.get(bookIdStr);
          if (existing) {
            existing.quantity += qty;
          } else {
            lineMap.set(bookIdStr, {
              quantity: qty,
              price: Number(matchedBook.sellingPrice ?? 0),
            });
          }

          matchedItems.push({
            rawToken: item.originalText || item.bookTitle,
            keyword: item.bookTitle || matchedBook.title,
            quantity: qty,
            book: matchedBook,
            isMatched: true,
          });
        } else {
          matchedItems.push({
            rawToken: item.originalText || item.bookTitle,
            keyword: item.bookTitle || item.originalText,
            quantity: Math.max(1, Math.round(item.quantity || 1)),
            isMatched: false,
          });
          unmatchedTokens.push(item.originalText || item.bookTitle);
        }
      }

      const lines: ProductLine[] = Array.from(lineMap.entries()).map(([bookId, data]) => ({
        bookId,
        quantity: data.quantity,
        price: data.price,
      }));

      if (lines.length > 0) {
        return {
          lines,
          matchedItems,
          unmatchedTokens,
          totalQuantity: lines.reduce((sum, l) => sum + l.quantity, 0),
          isAiParsed: true,
        };
      }
    }
  } catch (error) {
    console.warn("Gemini parse products failed, falling back to local parser:", error);
  }

  // Fallback: Chạy bộ phân tích cú pháp local
  const localResult = parseProductList(rawText, books);
  return { ...localResult, isAiParsed: false };
}
