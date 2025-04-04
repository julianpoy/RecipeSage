import { Prisma } from "@prisma/client";

export const labelSummary = Prisma.validator<Prisma.LabelFindFirstArgs>()({
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
});

export type LabelSummary = Prisma.LabelGetPayload<typeof labelSummary>;
