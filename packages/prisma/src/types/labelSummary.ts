import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";

export const labelSummary = {
  select: {
    id: true,
    userId: true,
    title: true,
    createdAt: true,
    updatedAt: true,
    labelGroupId: true,
    labelGroup: {
      select: {
        id: true,
        userId: true,
        title: true,
        warnWhenNotPresent: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    _count: {
      select: {
        recipeLabels: true,
      },
    },
  },
} satisfies Prisma.LabelFindFirstArgs;

export type LabelSummary = Prisma.LabelGetPayload<typeof labelSummary>;

export const labelSummarySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  title: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  labelGroupId: z.uuid().nullable(),
  labelGroup: z
    .object({
      id: z.uuid(),
      userId: z.uuid(),
      title: z.string(),
      warnWhenNotPresent: z.boolean(),
      createdAt: z.date(),
      updatedAt: z.date(),
    })
    .nullable(),
  _count: z.object({
    recipeLabels: z.number().int(),
  }),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof labelSummarySchema
> satisfies LabelSummary;
const _checkTypeSatisfiesSchema = {} as LabelSummary satisfies z.infer<
  typeof labelSummarySchema
>;
