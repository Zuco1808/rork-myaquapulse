import { z } from "zod";
import { publicProcedure } from "@/backend/trpc/create-context";

export default publicProcedure
  .input(z.object({ name: z.string().default("world") }))
  .query(({ input }) => {
    return {
      message: `Hello ${input.name}!`,
      timestamp: new Date(),
    };
  });