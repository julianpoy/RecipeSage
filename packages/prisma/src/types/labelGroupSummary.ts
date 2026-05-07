import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";

export const labelGroupSummary = {
  select: {
    id: true,
    userId: true,
    title: true,
    warnWhenNotPresent: true,
    createdAt: true,
    updatedAt: true,
    labels: {
      select: {
        labelGroupId: true,
      },
    },
  },
} satisfies Prisma.LabelGroupFindFirstArgs;

export type LabelGroupSummary = Prisma.LabelGroupGetPayload<
  typeof labelGroupSummary
>;

export const labelGroupSummarySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string(),
  warnWhenNotPresent: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  labels: z.array(
    z.object({
      labelGroupId: z.uuid().nullable(),
    }),
  ),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof labelGroupSummarySchema
> satisfies LabelGroupSummary;
const _checkTypeSatisfiesSchema = {} as LabelGroupSummary satisfies z.infer<
  typeof labelGroupSummarySchema
>;
