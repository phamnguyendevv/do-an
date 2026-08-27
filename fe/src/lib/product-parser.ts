import type { Book } from "@/types";
import type { ProductLine } from "@/components/inventory/product-lines";
import { normalizeText } from "./vn-address-parser";

export interface ParsedProductItem {
  rawToken: string;
  keyword: string;
  quantity: number;
  book?: Book;
  isMatched: boolean;
}

export interface ParsedProductListResult {
  matchedItems: ParsedProductItem[];
  unmatchedTokens: string[];
  lines: ProductLine[];
  totalQuantity: number;
}

/**
 * Noise words at the start of product keyword that should be stripped
 */
const NOISE_PREFIX_REGEX = /^(?:bản|ban|cuốn|cuon|quyển|quyen|sách|sach|tập|tap|bộ|bo|combo|tờ|to|cái|cai|chiếc|chiec)\s+/i;

/**
 * Extract quantity and cleaned product keyword from a single token
 */
export function extractQuantityAndKeyword(token: string): { quantity: number; keyword: string } {
  const trimmed = token.trim().replace(/^[-–—+*:,;|\s]+|[-–—+*:,;|\s]+$/g, "");
  if (!trimmed) return { quantity: 1, keyword: "" };

  let quantity = 1;
  let rawKeyword = trimmed;

  // Case 1: Prefix quantity with explicit multiplier or unit: "2 bản xanh lá", "3x zhenti", "2 * xanh lá", "2-xanh lá"
  const prefixExplicitMatch = trimmed.match(/^(\d{1,4})\s*(?:x|\*|bản|ban|cuốn|cuon|quyển|quyen|c|q|k|-|\:)\s+(.+)$/i);
  if (prefixExplicitMatch) {
    const num = parseInt(prefixExplicitMatch[1], 10);
    if (!isNaN(num) && num > 0 && num <= 9999) {
      quantity = num;
      rawKeyword = prefixExplicitMatch[2].trim();
    }
  } else {
    // Case 1B: Prefix quantity connected like "2xanh lá", "3xzhenti", "2x xanh lá"
    const prefixJoinedMatch = trimmed.match(/^(\d{1,4})(?:x|\*)\s*(.+)$/i);
    if (prefixJoinedMatch) {
      const num = parseInt(prefixJoinedMatch[1], 10);
      if (!isNaN(num) && num > 0 && num <= 9999) {
        quantity = num;
        rawKeyword = prefixJoinedMatch[2].trim();
      }
    } else {
      // Case 1C: Space separated number: "2 xanh lá", "10 tinh giảng"
      const prefixSpaceMatch = trimmed.match(/^(\d{1,4})\s+([a-zA-ZÀ-ỹ].+)$/i);
      if (prefixSpaceMatch) {
        const num = parseInt(prefixSpaceMatch[1], 10);
        if (!isNaN(num) && num > 0 && num <= 9999) {
          quantity = num;
          rawKeyword = prefixSpaceMatch[2].trim();
        }
      } else {
        // Case 2: Suffix quantity: "xanh lá 2", "zhenti x3", "tinh giảng sl: 2", "bản xanh lá - 2"
        const suffixMatch = trimmed.match(/^(.+?)\s*(?:x|\*|:|-|sl|số lượng|so luong)?\s*(\d{1,4})\s*(?:bản|ban|cuốn|cuon|quyển|quyen|c|q)?$/i);
        if (suffixMatch) {
          const potentialTitle = suffixMatch[1].trim();
          const num = parseInt(suffixMatch[2], 10);
          if (!isNaN(num) && num > 0 && num <= 9999 && /[a-zA-ZÀ-ỹ]{2,}/.test(potentialTitle)) {
            quantity = num;
            rawKeyword = potentialTitle;
          }
        }
      }
    }
  }

  // Strip leading noise prefixes: "bản xanh lá" -> "xanh lá"
  let cleanKeyword = rawKeyword.trim().replace(/^[-–—+*:,;|\s]+|[-–—+*:,;|\s]+$/g, "");
  while (NOISE_PREFIX_REGEX.test(cleanKeyword)) {
    cleanKeyword = cleanKeyword.replace(NOISE_PREFIX_REGEX, "").trim();
  }

  return {
    quantity: Math.max(1, quantity),
    keyword: cleanKeyword || rawKeyword.trim(),
  };
}

/**
 * Score how well a book matches a normalized search query
 * Higher score = better match. Score < 100 means no reliable match.
 */
export function scoreBookMatch(book: Book, normQuery: string): number {
  const normTitle = normalizeText(book.title || "");
  const normAuthor = normalizeText(book.author || "");
  const normId = normalizeText(String(book.id || ""));
  const normCategory = normalizeText(book.category || "");

  if (!normQuery || !normTitle) return 0;

  // 1. Exact title match
  if (normTitle === normQuery) return 1000;

  // 2. ID exact match
  if (normId === normQuery) return 950;

  // 3. Title starts with query
  if (normTitle.startsWith(normQuery)) {
    return 800 - Math.min(100, normTitle.length - normQuery.length);
  }

  // 4. Title ends with query
  if (normTitle.endsWith(normQuery)) {
    return 700 - Math.min(100, normTitle.length - normQuery.length);
  }

  // 5. Title contains query as full word or phrase
  if (normTitle.includes(` ${normQuery} `) || normTitle.startsWith(`${normQuery} `) || normTitle.endsWith(` ${normQuery}`)) {
    return 650 - Math.min(100, normTitle.length - normQuery.length);
  }

  // 6. Title contains query as substring
  if (normTitle.includes(normQuery)) {
    return 600 - Math.min(100, normTitle.length - normQuery.length);
  }

  // 7. Query contains title as substring (e.g. user typed full book name with extra description)
  if (normQuery.includes(normTitle) && normTitle.length >= 4) {
    return 550;
  }

  // 8. Word token subset matching
  const queryWords = normQuery.split(/\s+/).filter((w) => w.length > 0);
  const titleWords = normTitle.split(/\s+/).filter((w) => w.length > 0);

  if (queryWords.length > 0) {
    let matchedWordsCount = 0;
    for (const qw of queryWords) {
      if (titleWords.some((tw) => tw === qw || (qw.length >= 3 && tw.startsWith(qw)))) {
        matchedWordsCount++;
      }
    }

    if (matchedWordsCount === queryWords.length) {
      // All query words found in title!
      return 450 + matchedWordsCount * 10 - Math.min(100, titleWords.length - queryWords.length);
    } else if (matchedWordsCount >= 2 && matchedWordsCount >= Math.ceil(queryWords.length * 0.7)) {
      // Majority of words matched (at least 2 words)
      return 300 + matchedWordsCount * 10;
    }
  }

  // 9. Match author or category if query specifically matched
  if (normAuthor && (normAuthor === normQuery || normAuthor.includes(` ${normQuery} `))) {
    return 200;
  }

  return 0;
}

/**
 * Find the best matching book from inventory for a given keyword
 */
export function findBestMatchingBook(keyword: string, books: Book[]): { book: Book | null; score: number } {
  const norm = normalizeText(keyword);
  if (!norm || books.length === 0) return { book: null, score: 0 };

  let bestBook: Book | null = null;
  let highestScore = 0;

  for (const book of books) {
    const score = scoreBookMatch(book, norm);
    if (score > highestScore && score >= 100) {
      highestScore = score;
      bestBook = book;
    }
  }

  return { book: bestBook, score: highestScore };
}

/**
 * Recursively split a token by conjunctions (" và ", " va ", " & ") if splitting yields
 * two high-confidence matching products that score higher than keeping it together.
 */
export function splitSegmentByConjunction(segment: string, books: Book[]): string[] {
  const trimmed = segment.trim();
  if (!trimmed) return [];

  // Check how well the whole segment matches without splitting
  const wholeExtract = extractQuantityAndKeyword(trimmed);
  const wholeMatchKeyword = findBestMatchingBook(wholeExtract.keyword, books);
  const wholeMatchRaw = findBestMatchingBook(trimmed, books);
  const bestWholeScore = Math.max(wholeMatchKeyword.score, wholeMatchRaw.score);

  // If the whole segment is already an exact title match (score >= 950), don't split!
  if (bestWholeScore >= 950) {
    return [trimmed];
  }

  // Find all conjunction occurrences: " và ", " va ", " & "
  const conjRegex = /\s+(?:và|va|&)\s+/gi;
  const matches: Array<{ index: number; length: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = conjRegex.exec(trimmed)) !== null) {
    matches.push({ index: m.index, length: m[0].length });
  }

  if (matches.length === 0) {
    return [trimmed];
  }

  // Try each conjunction as a potential split point
  let bestSplit: { left: string; right: string; totalScore: number } | null = null;

  for (const match of matches) {
    const left = trimmed.slice(0, match.index).trim();
    const right = trimmed.slice(match.index + match.length).trim();

    if (!left || !right) continue;

    const leftExt = extractQuantityAndKeyword(left);
    const leftMatchKw = findBestMatchingBook(leftExt.keyword, books);
    const leftMatchRaw = findBestMatchingBook(left, books);
    const leftScore = Math.max(leftMatchKw.score, leftMatchRaw.score);

    const rightExt = extractQuantityAndKeyword(right);
    const rightMatchKw = findBestMatchingBook(rightExt.keyword, books);
    const rightMatchRaw = findBestMatchingBook(right, books);
    const rightScore = Math.max(rightMatchKw.score, rightMatchRaw.score);

    // Both sides must match a valid book (score >= 100)
    if (leftScore >= 100 && rightScore >= 100) {
      const combinedScore = leftScore + rightScore;
      if (!bestSplit || combinedScore > bestSplit.totalScore) {
        bestSplit = { left, right, totalScore: combinedScore };
      }
    }
  }

  // If we found a split where both sides match well, and combined score > bestWholeScore
  if (bestSplit && bestSplit.totalScore > bestWholeScore) {
    return [
      ...splitSegmentByConjunction(bestSplit.left, books),
      ...splitSegmentByConjunction(bestSplit.right, books),
    ];
  }

  return [trimmed];
}

/**
 * Strip conversational chatter at the start and end of product input text
 * e.g. "mình lấy 8 cuốn này  4 quyển  Học Máy...  freesip nha" -> "4 quyển  Học Máy..."
 */
export function cleanConversationalProductText(input: string): string {
  let text = input.trim();
  if (!text) return "";

  // 1. Remove vocatives / greetings at the beginning:
  // e.g. "E oii", "Em ơi", "Shop ơi", "Ad oiii", "Bạn ơi", "Chị oii", "Alo shop", "Hi shop", etc.
  const vocativeRegex = /^(?:alo|hi|hello|hey)?\s*(?:shop|ad|bạn|ban|chị|chi|c|anh|a|e|em)\s*(?:ơi+|oi+|ơii+|ơiii+|oiii+|nhé|nhe|nha|ạ|a)?\s*[:,-]?\s*/i;

  // 2. Remove order intent phrases at the beginning:
  // e.g. "gửi thêm cho c", "lấy thêm cho mình", "cho e đặt", "muốn mua thêm", "chốt hộ mình", "lấy 8 cuốn này", etc.
  const orderIntentRegex = /^(?:cho|gửi|gui|ship|giao)?\s*(?:mình|minh|em|e|chị|chi|c|anh|a|tôi|toi|khách|khach|bạn|ban)?\s*(?:muốn|cần)?\s*(?:lấy|lay|đặt|dat|mua|chốt|chot|gửi|gui|ship|giao|bán|ban|order|order giúp|chốt đơn|chot don)\s*(?:thêm|them|giúp|giup|hộ|ho)?\s*(?:cho\s+(?:mình|minh|em|e|chị|chi|c|anh|a|tôi|toi|khách|khach|bạn|ban|bé|be))?\s*(?:thêm|them|giúp|giup|hộ|ho)?\s*(?:(?:\d+\s*(?:cuốn|cuon|quyển|quyen|bản|ban|sách|sach|món|mon|cái|cai|bộ|bo))\s+(?:này|nay|sau|đây|day))?\s*(?:này|nay|sau|đây|day|nhe|nhé|nha|ạ|a)?\s*[:,-]?\s*/i;

  let prevText = "";
  while (text !== prevText) {
    prevText = text;
    if (vocativeRegex.test(text)) {
      const match = text.match(vocativeRegex);
      if (match && match[0].length < text.length) {
        text = text.slice(match[0].length).trim();
      }
    }
    if (orderIntentRegex.test(text)) {
      const match = text.match(orderIntentRegex);
      if (match && match[0].length < text.length) {
        text = text.slice(match[0].length).trim();
      }
    }
  }

  // 3. Remove trailing shipping notes, gratitude, or conversational closing words:
  // e.g. "freesip nha", "freeship nhé shop", "fs nha", "giao nhanh giúp mình", "tks shop", "cảm ơn", etc.
  const trailingChatRegex = /\s+(?:free\s*ship|freeship|freesip|fresship|fs|miễn\s*phí\s*ship|mien\s*phi\s*ship|free\s*ship\s*nha|freeship\s*nhé|freeship\s*nha|freeship\s*nha\s*shop|freeship\s*cho\s*em|ship\s*nhanh|giao\s*sớm|giao\s*nhanh|bọc\s*kỹ|bọc\s*cẩn\s*thận|gọi\s*trước\s*khi\s*giao|giao\s*giờ\s*hành\s*chính|gọi\s*trước|tks\s*shop|thanks\s*shop|thanks|cảm\s*ơn\s*shop|cam\s*on\s*shop|cảm\s*ơn|cam\s*on|nhé\s*shop|nha\s*shop|nhe\s*shop|nha+|nhé+|nhe+|ạ|a|nha\s*b|nhé\s*b|nha\s*e|nhé\s*e)\s*$/i;

  prevText = "";
  while (text !== prevText && trailingChatRegex.test(text)) {
    prevText = text;
    text = text.replace(trailingChatRegex, "").trim();
  }

  return text.trim();
}

/**
 * Parse a raw text containing product list (e.g. "2 bản xanh lá + zhenti+ tinh giảng+ 25 tian")
 */
export function parseProductList(rawInput: string, books: Book[]): ParsedProductListResult {
  const cleanedInput = cleanConversationalProductText(rawInput);
  if (!cleanedInput) {
    return {
      matchedItems: [],
      unmatchedTokens: [],
      lines: [],
      totalQuantity: 0,
    };
  }

  // 1. Initial split by explicit delimiters: "+", ",", ";", "\n", "|"
  const initialSegments = cleanedInput
    .split(/(?:\s*\+\s*|\s*,\s*|\s*;\s*|[\r\n]+|\s*\|\s*)/i)
    .map((t) => t.trim().replace(/^["'“”«»\s]+|["'“”«»\s]+$/g, ""))
    .filter((t) => t.length > 0);

  // 2. Intelligent conjunction splitting on each segment (e.g. "Học Máy Và Trí Tuệ Nhân Tạo và Chuyện Con Mèo")
  const rawTokens: string[] = [];
  for (const seg of initialSegments) {
    const subTokens = splitSegmentByConjunction(seg, books);
    rawTokens.push(...subTokens);
  }

  const matchedItems: ParsedProductItem[] = [];
  const unmatchedTokens: string[] = [];
  const lineMap = new Map<string, { quantity: number; price: number }>();

  for (const rawToken of rawTokens) {
    const extracted = extractQuantityAndKeyword(rawToken);
    
    // Check match with extracted keyword
    const matchWithKeyword = findBestMatchingBook(extracted.keyword, books);
    // Also check match with the whole raw token (in case the leading number is part of the title like "25 tian")
    const matchWithRaw = findBestMatchingBook(rawToken, books);

    let finalBook: Book | null = null;
    let finalQuantity = extracted.quantity;
    let finalKeyword = extracted.keyword;

    if (matchWithRaw.book && matchWithRaw.score > matchWithKeyword.score + 100) {
      // The raw token (e.g. "25 tian") is a much better match than the stripped keyword ("tian")
      finalBook = matchWithRaw.book;
      finalQuantity = 1;
      finalKeyword = rawToken;
    } else if (matchWithKeyword.book) {
      finalBook = matchWithKeyword.book;
      finalQuantity = extracted.quantity;
      finalKeyword = extracted.keyword;
    } else if (matchWithRaw.book) {
      finalBook = matchWithRaw.book;
      finalQuantity = 1;
      finalKeyword = rawToken;
    }

    if (finalBook) {
      matchedItems.push({
        rawToken,
        keyword: finalKeyword,
        quantity: finalQuantity,
        book: finalBook,
        isMatched: true,
      });

      const bookIdStr = String(finalBook.id);
      const existing = lineMap.get(bookIdStr);
      if (existing) {
        existing.quantity += finalQuantity;
      } else {
        lineMap.set(bookIdStr, {
          quantity: finalQuantity,
          price: Number(finalBook.sellingPrice ?? 0),
        });
      }
    } else {
      matchedItems.push({
        rawToken,
        keyword: extracted.keyword,
        quantity: extracted.quantity,
        isMatched: false,
      });
      unmatchedTokens.push(rawToken);
    }
  }

  const lines: ProductLine[] = Array.from(lineMap.entries()).map(([bookId, data]) => ({
    bookId,
    quantity: data.quantity,
    price: data.price,
  }));

  const totalQuantity = lines.reduce((sum, l) => sum + l.quantity, 0);

  return {
    matchedItems,
    unmatchedTokens,
    lines,
    totalQuantity,
  };
}
