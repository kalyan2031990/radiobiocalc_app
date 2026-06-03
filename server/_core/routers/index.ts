/**
 * Main tRPC Router
 * 
 * Aggregates all sub-routers (auth, radiobiology, etc.)
 */

import { router } from "../trpc";
import { radiobiologyRouter } from "./radiobiology";

export const appRouter = router({
  radiobiology: radiobiologyRouter,
});

export type AppRouter = typeof appRouter;
