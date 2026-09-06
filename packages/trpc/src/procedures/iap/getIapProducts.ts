import { publicProcedure } from "../../trpc";
import { z } from "zod";
import { config } from "@recipesage/util/server/general";

export const getIapProducts = publicProcedure
  .input(
    z.object({
      platform: z.enum(["apple", "google"]),
    }),
  )
  .output(
    z.object({
      monthly: z.array(z.string()),
      yearly: z.array(z.string()),
    }),
  )
  .query(async ({ input }) => {
    if (process.env.NODE_ENV === "selfhost") {
      return { monthly: [], yearly: [] };
    }

    const iapConfig =
      input.platform === "apple" ? config.apple.iap : config.google.iap;

    return {
      monthly: iapConfig.productIdsMonthly,
      yearly: iapConfig.productIdsYearly,
    };
  });
