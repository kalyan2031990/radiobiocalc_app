import { describe, it, expect } from "vitest";
import { capTcpForDisplay, TCP_DISPLAY_CAP } from "@/lib/tcp-display";

describe("tcp display cap", () => {
  it("leaves TCP below cap unchanged", () => {
    const r = capTcpForDisplay(0.82);
    expect(r.display).toBeCloseTo(0.82, 8);
    expect(r.capped).toBe(false);
  });

  it("caps saturated TCP at 95%", () => {
    const r = capTcpForDisplay(1);
    expect(r.display).toBeCloseTo(TCP_DISPLAY_CAP, 8);
    expect(r.raw).toBeCloseTo(1, 8);
    expect(r.capped).toBe(true);
  });
});
