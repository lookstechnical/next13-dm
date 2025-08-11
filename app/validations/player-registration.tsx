import z from "zod";

export const step1 = z.object({
  email: z.email(),
});

export const step2 = z.object({
  email: z.email(),
  name: z.string(),
});
