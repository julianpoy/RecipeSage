import { prisma } from "@recipesage/prisma";
import { Capabilities } from "@recipesage/util/shared";
import { userHasCapability } from "../../capabilities";
import { CONTRIBUTOR_DAILY_CREDITS, FREE_DAILY_CREDITS } from "./creditCosts";
import { z } from "zod";

export interface DailyCreditUsage {
  used: number;
  limit: number;
  resetsAt: Date;
}

export const dailyCreditUsageSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
  resetsAt: z.date(),
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
  const hasMoreCredits = await userHasCapability(
    userId,
    Capabilities.MoreUsageCredits,
  );

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
  const limit = hasMoreCredits ? CONTRIBUTOR_DAILY_CREDITS : FREE_DAILY_CREDITS;

  return { used, limit, resetsAt };
};
