import { z } from "zod";

/**
 * Case facts are untrusted input and so is this form — it sits outside the
 * login on a public page. Everything is length-bounded so a paste bomb can't
 * become a database row.
 */
export const accessRequestSchema = z.object({
  email: z.email({ message: "A valid email address is required" }).max(254),
  fullName: z.string().trim().min(1, "Name is required").max(200),
  firm: z.string().trim().max(200).optional().or(z.literal("")),
  barNumber: z.string().trim().max(60).optional().or(z.literal("")),
  jurisdiction: z.string().trim().max(120).optional().or(z.literal("")),
  useCase: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type AccessRequestInput = z.infer<typeof accessRequestSchema>;
