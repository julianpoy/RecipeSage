import { prisma, UserPublic, userPublicSchema } from "@recipesage/prisma";
import { authenticatedProcedure } from "../../trpc";
import { userPublic } from "@recipesage/prisma";
import {
  capabilitiesForSubscription,
  SubscriptionModelName,
  subscriptionsForUser,
} from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";
import { z } from "zod";

export interface UserPrivate {
  email: string;
  createdAt: Date;
  updatedAt: Date;
  subscriptions: {
    expires: Date | null;
    capabilities: Capabilities[];
  }[];
}

const userMeSchema = userPublicSchema.extend({
  email: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  subscriptions: z.array(
    z.object({
      expires: z.date().nullable(),
      capabilities: z.array(z.enum(Capabilities)),
    }),
  ),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof userMeSchema
> satisfies UserPublic & UserPrivate;
const _checkTypeSatisfiesSchema = {} as UserPublic &
  UserPrivate satisfies z.infer<typeof userMeSchema>;

export const getMe = authenticatedProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getMe",
      tags: ["users"],
      summary: "Get the caller's user profile and subscription info",
      protect: true,
    },
  })
  .output(userMeSchema)
  .query(async ({ ctx }): Promise<UserPublic & UserPrivate> => {
    const profile = await prisma.user.findUniqueOrThrow({
      where: {
        id: ctx.session.userId,
      },
      select: {
        ...userPublic.select,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const subscriptions = (
      await subscriptionsForUser(ctx.session.userId, true)
    ).map((subscription) => {
      return {
        expires: subscription.expires,
        capabilities: capabilitiesForSubscription(
          subscription.name as SubscriptionModelName,
        ),
      };
    });

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      handle: profile.handle,
      enableProfile: profile.enableProfile,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
      profileImages: profile.profileImages,
      subscriptions,
    };
  });
