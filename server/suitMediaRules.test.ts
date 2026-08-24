import { describe, expect, it } from "vitest";
import { assertNextStudioSuitView } from "./suitMediaRules";

describe("one-at-a-time Studio suit view rules", () => {
  it("requires front, then back, then detail before optional editorial views", () => {
    expect(() => assertNextStudioSuitView(0, ["back"], 1)).toThrow(/front image next/i);
    expect(() => assertNextStudioSuitView(0, ["front", "back"], 2)).toThrow(/front image next/i);
    expect(() => assertNextStudioSuitView(0, ["front"], 1)).not.toThrow();
    expect(() => assertNextStudioSuitView(1, ["back"], 1)).not.toThrow();
    expect(() => assertNextStudioSuitView(2, ["detail"], 1)).not.toThrow();
    expect(() => assertNextStudioSuitView(3, ["editorial"], 1)).not.toThrow();
  });
});
