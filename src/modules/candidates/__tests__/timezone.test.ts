import { describe, expect, it } from "vitest";
import { isIanaTimeZone } from "../service/timezone";

describe("IANA timezones", () => {
  it("accepts real IANA names and rejects offsets", () => {
    expect(isIanaTimeZone("Europe/Berlin")).toBe(true);
    expect(isIanaTimeZone("America/New_York")).toBe(true);
    expect(isIanaTimeZone("UTC")).toBe(true);
    expect(isIanaTimeZone("UTC+3")).toBe(false);
    expect(isIanaTimeZone("GMT+1")).toBe(false);
    expect(isIanaTimeZone("+03:00")).toBe(false);
    expect(isIanaTimeZone("Etc/GMT+3")).toBe(false);
    expect(isIanaTimeZone("Not/AZone")).toBe(false);
    expect(isIanaTimeZone("  ")).toBe(false);
  });
});
