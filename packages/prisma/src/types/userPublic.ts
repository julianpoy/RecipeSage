import { Prisma } from "@prisma/client";

export const userPublic = Prisma.validator<Prisma.UserFindFirstArgs>()({
  select: {
    id: true,
    email: true,
    name: true,
    handle: true,
    profileVisibility: true,
    enableProfile: true,
  },
});

export type UserPublic = Prisma.UserGetPayload<typeof userPublic>;
