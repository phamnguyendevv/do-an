import type { Book } from "@/types";

interface BookCoverProps {
  book: Pick<Book, "title" | "author" | "category">;
  className?: string;
}

const palettes = {
  literature: { background: "#173b37", accent: "#b9d6a5", detail: "#e7bb72", text: "#fff9ec" },
  business: { background: "#263451", accent: "#9bc2d3", detail: "#e9c27b", text: "#fbf6ed" },
  technology: { background: "#503438", accent: "#e0a37c", detail: "#ead2a0", text: "#fff5e9" },
  general: { background: "#373052", accent: "#c5a6df", detail: "#e7c182", text: "#fbf5ff" },
};

function wrapText(value: string, maxLength: number): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  for (const word of words) {
    const currentLine = lines.at(-1);
    if (currentLine && `${currentLine} ${word}`.length <= maxLength) {
      lines[lines.length - 1] = `${currentLine} ${word}`;
    } else {
      lines.push(word);
    }
  }

  return lines;
}

function paletteForCategory(category: string) {
  const normalized = category.toLocaleLowerCase();
  if (normalized.includes("văn học")) return palettes.literature;
  if (normalized.includes("kinh tế") || normalized.includes("kinh doanh")) return palettes.business;
  if (normalized.includes("công nghệ") || normalized.includes("thông tin"))
    return palettes.technology;
  return palettes.general;
}

export function BookCover({ book, className }: BookCoverProps) {
  const palette = paletteForCategory(book.category);
  const titleLines = wrapText(book.title, 17).slice(0, 5);
  const authorLines = wrapText(book.author, 24).slice(0, 2);
  const titleFontSize = book.title.length > 35 ? 14 : 16;

  return (
    <svg
      viewBox="0 0 180 260"
      role="img"
      aria-label={`Bìa sách ${book.title} — ${book.author}`}
      className={`block ${className ?? ""}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="180" height="260" rx="8" fill={palette.background} />
      <path d="M0 0h180v68c-46 17-92 17-180-3z" fill={palette.accent} opacity=".13" />
      <circle cx="142" cy="50" r="29" fill={palette.detail} opacity=".2" />
      <path
        d="M116 54c10-13 22-18 37-18m-29 31c9-7 19-10 30-10M23 77c26-20 47-24 70-15"
        fill="none"
        stroke={palette.accent}
        strokeLinecap="round"
        strokeWidth="2"
        opacity=".7"
      />
      <path d="M18 18v224" stroke={palette.accent} strokeOpacity=".45" strokeWidth="1" />
      <text
        x="28"
        y="31"
        fill={palette.accent}
        fontFamily="Arial, sans-serif"
        fontSize="8"
        fontWeight="700"
        letterSpacing="2"
      >
        BOOKSTOCK
      </text>
      <text
        x="27"
        y={105 - (titleLines.length - 1) * 9}
        fill={palette.text}
        fontFamily="Georgia, serif"
        fontSize={titleFontSize}
        fontWeight="700"
      >
        {titleLines.map((line, index) => (
          <tspan key={`${line}-${index}`} x="27" dy={index === 0 ? 0 : 22}>
            {line}
          </tspan>
        ))}
      </text>
      <path d="M27 169h42" stroke={palette.detail} strokeWidth="3" />
      <text
        x="27"
        y="190"
        fill={palette.accent}
        fontFamily="Arial, sans-serif"
        fontSize="9"
        fontWeight="600"
      >
        {authorLines.map((line, index) => (
          <tspan key={`${line}-${index}`} x="27" dy={index === 0 ? 0 : 13}>
            {line}
          </tspan>
        ))}
      </text>
      <path d="M27 229h126" stroke={palette.text} strokeOpacity=".25" />
      <text
        x="27"
        y="243"
        fill={palette.text}
        fontFamily="Arial, sans-serif"
        fontSize="7"
        opacity=".8"
      >
        {book.category.slice(0, 30)}
      </text>
      <rect
        x=".75"
        y=".75"
        width="178.5"
        height="258.5"
        rx="8"
        fill="none"
        stroke={palette.text}
        strokeOpacity=".22"
        strokeWidth="1.5"
      />
    </svg>
  );
}
