/**
 * Email/password authentication (mobile + web).
 */

import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { registerEmailUser, loginEmailUser } from "../../email-auth-store";

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8).max(128);

export const authLocalRouter = router({
  registerWithEmail: publicProcedure
    .input(
      z.object({
        email: emailSchema,
        password: passwordSchema,
        name: z.string().min(1).max(120),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await registerEmailUser(input.email, input.password, input.name);
      if (!result.success) return result;
      return {
        success: true as const,
        userId: result.userId,
        token: `email_${result.userId}`,
      };
    }),

  loginWithEmail: publicProcedure
    .input(z.object({ email: emailSchema, password: passwordSchema }))
    .mutation(async ({ input }) => {
      const result = await loginEmailUser(input.email, input.password);
      if (!result.success) return result;
      return {
        success: true as const,
        userId: result.userId,
        name: result.name,
        email: result.email,
        token: `email_${result.userId}`,
      };
    }),
});
