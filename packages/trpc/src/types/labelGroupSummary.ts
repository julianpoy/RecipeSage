import { Prisma } from "@prisma/client";

export const labelGroupSummary = Prisma.validator<Prisma.LabelGroupArgs>()({
  select: {
    id: true,
    title: true,
    warnWhenNotPresent: true,
    createdAt: true,
    updatedAt: true,
    _count: {
      select: {
        labels: true,
      },
    },
  },
});

export type LabelGroupSummary = Prisma.LabelGroupGetPayload<
  typeof labelGroupSummary
>;
