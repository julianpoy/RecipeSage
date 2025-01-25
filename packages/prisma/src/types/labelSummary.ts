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
        title: true,
        warnWhenNotPresent: true,
        createdAt: true,
        updatedAt: true,
      },
    },
    recipeLabels: {
      select: {
        // Note: Do not query recipe ID here, since that would transmit unshared IDs to shared users
        labelId: true,
      },
    },
  },
});

export type LabelSummary = Prisma.LabelGetPayload<typeof labelSummary>;
