import { Prisma } from "@prisma/client";
import { labelGroupSummary } from "./labelGroupSummary";

export const labelSummary = Prisma.validator<Prisma.LabelArgs>()({
  select: {
    id: true,
    title: true,
    createdAt: true,
    updatedAt: true,
    labelGroupId: true,
    labelGroup: labelGroupSummary,
    _count: {
      select: {
        recipeLabels: true,
      }
    }
  },
});

export type LabelSummary = Prisma.LabelGetPayload<typeof labelSummary>;

