import { describe, expect, it } from "vitest";
import { dayKey, formatClock, formatCountdown, formatDateTime, ownerName, percent, rupiah, shortAccount, shortHash } from "@/lib/format";
import { nsToMs, parseChainJson } from "@/lib/json";

describe("rupiah", () => {
  it("formats en-US style with comma separators and no decimals", () => {
    expect(rupiah(16650)).toBe("Rp16,650");
    expect(rupiah("1422526")).toBe("Rp1,422,526");
    expect(rupiah(0n)).toBe("Rp0");
    expect(rupiah(999)).toBe("Rp999");
  });
  it("handles negatives and huge values", () => {
    expect(rupiah(-1500)).toBe("-Rp1,500");
    expect(rupiah("123456789012345678901")).toBe("Rp123,456,789,012,345,678,901");
  });
});

describe("misc formatting", () => {
  it("formats percent with a decimal point", () => expect(percent(28.44)).toBe("28.4%"));
  it("formats countdowns", () => {
    expect(formatCountdown(125_000)).toBe("02:05");
    expect(formatCountdown(3_725_000)).toBe("1:02:05");
    expect(formatCountdown(2 * 86_400_000 + 3 * 3_600_000)).toBe("2d 3h");
    expect(formatCountdown(-5000)).toBe("00:00");
  });
  it("shortens accounts and hashes", () => {
    expect(shortAccount("warung-01.koelakan.testnet")).toBe("warung-01");
    expect(shortHash("5d8e9db5487dadd47aa1d0db89f88138346b7ecfa98dce22e53b8369668cb804")).toBe("5d8e9d...cb804");
  });
  it("maps warung accounts to the same owner names as the agents", () => {
    expect(ownerName("warung-01.koelakan.testnet")).toBe("Pak Budi");
    expect(ownerName("warung-20.koelakan.testnet")).toBe("Bu Sri");
    expect(ownerName("alice.testnet")).toBe("Owner");
  });
  it("formats dates and clock times in English with WIB", () => {
    // 2026-11-12T08:23Z is 15:23 in Jakarta (UTC+7).
    expect(formatDateTime(Date.UTC(2026, 10, 12, 8, 23))).toBe("12 Nov, 15:23 WIB");
    expect(formatClock(Date.UTC(2026, 10, 12, 0, 5))).toBe("07:05");
  });
  it("groups days in Jakarta time", () => {
    // 2026-11-12T17:30Z is already 13 Nov in WIB (UTC+7).
    expect(dayKey(Date.UTC(2026, 10, 12, 17, 30))).toBe("2026-11-13");
  });
});

describe("parseChainJson", () => {
  it("keeps nanosecond timestamps exact", () => {
    const raw = '{"opened_at":1794471466197747196,"join_deadline":1794471586197747196,"qty":3}';
    const parsed = parseChainJson<{ opened_at: string; join_deadline: string; qty: number }>(raw);
    expect(parsed.opened_at).toBe("1794471466197747196");
    expect(parsed.qty).toBe(3);
    expect(nsToMs(parsed.join_deadline)).toBe(1794471586197);
  });
});
