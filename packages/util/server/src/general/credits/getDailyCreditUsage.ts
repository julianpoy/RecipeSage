import { prisma } from "@recipesage/prisma";
import { Capabilities } from "@recipesage/util/shared";
import { userHasCapability } from "../../capabilities";
import { CONTRIBUTOR_DAILY_CREDITS, FREE_DAILY_CREDITS } from "./creditCosts";
import { z } from "zod";

export interface DailyCreditUsage {
  used: number;
  limit: number;
  resetsAt: Date;
  unlimited: boolean;
}

export const dailyCreditUsageSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  resetsAt: z.date(),
  unlimited: z.boolean(),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof dailyCreditUsageSchema
> satisfies DailyCreditUsage;
const _checkTypeSatisfiesSchema = {} as DailyCreditUsage satisfies z.infer<
  typeof dailyCreditUsageSchema
>;

export const getDailyCreditUsage = async (
  userId: string,
): Promise<DailyCreditUsage> => {
  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);

  const resetsAt = new Date(dayStart);
  resetsAt.setUTCDate(resetsAt.getUTCDate() + 1);

  const result = await prisma.userCreditLog.aggregate({
    _sum: { credits: true },
    where: {
      userId,
      createdAt: {
        gte: dayStart,
      },
    },
  });

  const used = result._sum.credits ?? 0;

  const hasMoreCredits = await userHasCapability(
    userId,
    Capabilities.MoreUsageCredits,
  );
  const limit = hasMoreCredits ? CONTRIBUTOR_DAILY_CREDITS : FREE_DAILY_CREDITS;
  const unlimited = process.env.NODE_ENV === "selfhost" && hasMoreCredits;

  return { used, limit, resetsAt, unlimited };
};
