import { Prisma } from "@prisma/client";

export const labelSummary = Prisma.validator<Prisma.LabelArgs>()({
  select: {
    id: true,
    title: true,
    createdAt: true,
    updatedAt: true,
    labelGroupId: true,
    labelGroup: {
      select: {
        id: true,
        title: true,
        warnWhenNotPresent: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    recipeLabels: {
      select: {
        labelId: true,
      },
    },
  },
});

export type LabelSummary = Prisma.LabelGetPayload<typeof labelSummary>;
