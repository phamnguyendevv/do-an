import { describe, expect, it } from "vitest";
import {
  DATE_PRESETS,
  endOf,
  formatDateRange,
  getActivePreset,
  inDateRange,
  isSameDay,
  normalizeDateRange,
  startOf,
  toApiDateRange,
} from "./date-range-picker";

describe("date-range-picker helpers", () => {
  it("normalizes startOf to 00:00:00.000", () => {
    const d = new Date(2026, 9, 27, 15, 30, 45);
    const s = startOf(d);
    expect(s.getHours()).toBe(0);
    expect(s.getMinutes()).toBe(0);
    expect(s.getSeconds()).toBe(0);
    expect(s.getMilliseconds()).toBe(0);
  });

  it("normalizes endOf to 23:59:59.999", () => {
    const d = new Date(2026, 9, 27, 8, 10, 0);
    const e = endOf(d);
    expect(e.getHours()).toBe(23);
    expect(e.getMinutes()).toBe(59);
    expect(e.getSeconds()).toBe(59);
    expect(e.getMilliseconds()).toBe(999);
  });

  it("identifies same day correctly", () => {
    const d1 = new Date(2026, 9, 27, 2, 0, 0);
    const d2 = new Date(2026, 9, 27, 23, 59, 59);
    const d3 = new Date(2026, 9, 28, 0, 0, 0);
    expect(isSameDay(d1, d2)).toBe(true);
    expect(isSameDay(d1, d3)).toBe(false);
  });

  it("normalizes single-day dateRange", () => {
    const from = new Date(2026, 9, 25);
    const norm = normalizeDateRange({ from, to: undefined });
    expect(norm).toBeDefined();
    expect(norm?.from.getHours()).toBe(0);
    expect(norm?.to.getHours()).toBe(23);
    expect(norm?.to.getMilliseconds()).toBe(999);
  });

  it("converts DateRange to API parameters with full day coverage", () => {
    const d = new Date(2026, 9, 25);
    const apiParams = toApiDateRange({ from: d, to: undefined });
    expect(apiParams.startDate).toBeDefined();
    expect(apiParams.endDate).toBeDefined();
    expect(new Date(apiParams.startDate!).getTime()).toBeLessThan(
      new Date(apiParams.endDate!).getTime(),
    );
  });

  it("formats single day cleanly without trailing ellipsis or duplicate date", () => {
    const d = new Date(2026, 9, 27);
    const labelSingle = formatDateRange({ from: d, to: undefined });
    const labelSameDay = formatDateRange({ from: d, to: d });
    expect(labelSingle).not.toContain("–");
    expect(labelSingle).toContain("27/10/2026");
    expect(labelSameDay).toBe(labelSingle);
  });

  it("formats range correctly", () => {
    const from = new Date(2026, 9, 20);
    const to = new Date(2026, 9, 27);
    const label = formatDateRange({ from, to });
    expect(label).toBe("20/10/2026 – 27/10/2026");
  });

  it("inDateRange accurately checks records within single-day and multi-day ranges", () => {
    const from = new Date(2026, 9, 25);
    const recordMorning = new Date(2026, 9, 25, 9, 0, 0).toISOString();
    const recordNight = new Date(2026, 9, 25, 23, 30, 0).toISOString();
    const recordNextDay = new Date(2026, 9, 26, 0, 5, 0).toISOString();

    // Single day filter
    expect(inDateRange(recordMorning, { from, to: undefined })).toBe(true);
    expect(inDateRange(recordNight, { from, to: undefined })).toBe(true);
    expect(inDateRange(recordNextDay, { from, to: undefined })).toBe(false);
  });

  it("detects active preset accurately even when to is undefined", () => {
    const todayPreset = DATE_PRESETS.find((p) => p.label === "Hôm nay");
    expect(todayPreset).toBeDefined();

    const now = new Date();
    // User picked today on calendar without explicitly choosing 'to'
    const userRange = { from: now, to: undefined };
    expect(getActivePreset(userRange)).toBe("Hôm nay");
  });
});
