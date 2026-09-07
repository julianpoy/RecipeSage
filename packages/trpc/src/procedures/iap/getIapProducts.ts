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
      productIds: z.array(z.string()),
      monthly: z.array(z.string()),
      yearly: z.array(z.string()),
    }),
  )
  .query(async ({ input }) => {
    if (process.env.NODE_ENV === "selfhost") {
      return { productIds: [], monthly: [], yearly: [] };
    }

    if (input.platform === "apple") {
      const { productIdsMonthly, productIdsYearly } = config.apple.iap;
      return {
        productIds: [...productIdsMonthly, ...productIdsYearly],
        monthly: productIdsMonthly,
        yearly: productIdsYearly,
      };
    }

    const { productId, basePlanIdsMonthly, basePlanIdsYearly } =
      config.google.iap;
    return {
      productIds: productId ? [productId] : [],
      monthly: basePlanIdsMonthly,
      yearly: basePlanIdsYearly,
    };
  });
