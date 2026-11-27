const graphemeSegmenter = new Intl.Segmenter("vi", { granularity: "grapheme" });

function graphemes(value: string) {
  return Array.from(graphemeSegmenter.segment(value.normalize("NFC")), ({ segment }) => segment);
}

export function wrapCoverText(value: string, maxLength: number): string[] {
  const words = value
    .normalize("NFC")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((word) => {
      const characters = graphemes(word);
      if (characters.length <= maxLength) return [word];
      return Array.from({ length: Math.ceil(characters.length / maxLength) }, (_, index) =>
        characters.slice(index * maxLength, (index + 1) * maxLength).join(""),
      );
    });
  const lines: string[] = [];

  for (const word of words) {
    const currentLine = lines.at(-1);
    if (currentLine && graphemes(`${currentLine} ${word}`).length <= maxLength) {
      lines[lines.length - 1] = `${currentLine} ${word}`;
    } else {
      lines.push(word);
    }
  }

  return lines;
}

export function truncateCoverText(value: string, maxLength: number): string {
  const characters = graphemes(value);
  if (characters.length <= maxLength) return value;
  return `${characters.slice(0, maxLength - 1).join("")}…`;
}
