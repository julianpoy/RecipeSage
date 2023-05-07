import { publicProcedure, router } from '../../trpc';
import { z } from 'zod';

export const getRecipes = publicProcedure
  .input(z.object({
    example: z.string()
  }))
  .query(async ({ input }) => {
    return [input.example];
  });

