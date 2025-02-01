import { Prisma } from "@prisma/client";

export const userPublic = Prisma.validator<Prisma.UserFindFirstArgs>()({
  select: {
    id: true,
    email: true,
    name: true,
    handle: true,
    enableProfile: true,
    profileImages: {
      select: {
        order: true,
        imageId: true,
        image: {
          select: {
            id: true,
            location: true,
          },
        },
      },
    },
  },
});

export type UserPublic = Prisma.UserGetPayload<typeof userPublic>;
