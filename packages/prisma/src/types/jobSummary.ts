import { Prisma } from "@prisma/client";

export const jobSummary = Prisma.validator<Prisma.JobArgs>()({
  select: {
    id: true,
    status: true,
    type: true,
    userId: true,
    resultCode: true,
    progress: true,
    createdAt: true,
    updatedAt: true,
  },
});

export type JobSummary = Prisma.JobGetPayload<typeof jobSummary>;
