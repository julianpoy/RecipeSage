import { Prisma } from "@prisma/client";

export const labelGroupSummary =
  Prisma.validator<Prisma.LabelGroupFindFirstArgs>()({
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
  });

export type LabelGroupSummary = Prisma.LabelGroupGetPayload<
  typeof labelGroupSummary
>;
