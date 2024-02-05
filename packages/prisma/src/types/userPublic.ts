import { Prisma } from "@prisma/client";

export const userPublic = Prisma.validator<Prisma.UserArgs>()({
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
