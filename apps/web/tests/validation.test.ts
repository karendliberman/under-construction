import { describe, it, expect } from "vitest";
import { accessRequestSchema } from "@/lib/validation";

describe("accessRequestSchema", () => {
  const valid = { email: "ben@example.com", fullName: "Ben" };

  it("accepts the minimum: email and name", () => {
    expect(accessRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a malformed email", () => {
    expect(accessRequestSchema.safeParse({ ...valid, email: "nope" }).success).toBe(false);
  });

  it("rejects an empty or whitespace-only name", () => {
    expect(accessRequestSchema.safeParse({ ...valid, fullName: "" }).success).toBe(false);
    expect(accessRequestSchema.safeParse({ ...valid, fullName: "   " }).success).toBe(false);
  });

  it("bounds every field, so a paste bomb cannot become a row", () => {
    const huge = "x".repeat(5000);
    expect(accessRequestSchema.safeParse({ ...valid, useCase: huge }).success).toBe(false);
    expect(accessRequestSchema.safeParse({ ...valid, firm: huge }).success).toBe(false);
    expect(accessRequestSchema.safeParse({ ...valid, email: `${huge}@e.com` }).success).toBe(false);
  });

  it("treats optional fields as genuinely optional, including empty strings", () => {
    const r = accessRequestSchema.safeParse({ ...valid, firm: "", jurisdiction: "", useCase: "" });
    expect(r.success).toBe(true);
  });

  it("trims names", () => {
    const r = accessRequestSchema.safeParse({ ...valid, fullName: "  Ben  " });
    expect(r.success && r.data.fullName).toBe("Ben");
  });
});
