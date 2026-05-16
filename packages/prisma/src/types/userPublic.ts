import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";

export const userPublic = {
  select: {
    id: true,
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
} satisfies Prisma.UserFindFirstArgs;

export type UserPublic = Prisma.UserGetPayload<typeof userPublic>;

export const userPublicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  handle: z.string().nullable(),
  enableProfile: z.boolean(),
  profileImages: z.array(
    z.object({
      order: z.number().int(),
      imageId: z.uuid(),
      image: z.object({
        id: z.uuid(),
        location: z.string(),
      }),
    }),
  ),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof userPublicSchema
> satisfies UserPublic;
const _checkTypeSatisfiesSchema = {} as UserPublic satisfies z.infer<
  typeof userPublicSchema
>;
