import { describe, expect, it } from "vitest";

import { truncateCoverText, wrapCoverText } from "./book-cover-text";

describe("book cover text", () => {
  it("keeps Vietnamese combining marks together when wrapping", () => {
    const lines = wrapCoverText("A\u0301B\u0301C\u0301", 1);

    expect(lines).toEqual(["Á", "B\u0301", "Ć"]);
    expect(lines.every((line) => !/^\p{M}/u.test(line))).toBe(true);
  });

  it("truncates by grapheme without cutting a Vietnamese character", () => {
    expect(truncateCoverText("A\u0301B\u0301C\u0301", 2)).toBe("Á…");
  });
});
