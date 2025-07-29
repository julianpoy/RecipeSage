import { prisma, UserPublic } from "@recipesage/prisma";
import { publicProcedure } from "../../trpc";
import { userPublic } from "@recipesage/prisma";
import { validateTrpcSession } from "@recipesage/util/server/general";
import {
  capabilitiesForSubscription,
  SubscriptionModelName,
  subscriptionsForUser,
} from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";

export interface UserPrivate {
  email: string;
  createdAt: Date;
  updatedAt: Date;
  subscriptions: {
    expires: Date | null;
    capabilities: Capabilities[];
  }[];
}

export const getMe = publicProcedure.query(
  async ({ ctx }): Promise<UserPublic & UserPrivate> => {
    const session = ctx.session;
    validateTrpcSession(session);

    const profile = await prisma.user.findUniqueOrThrow({
      where: {
        id: session.userId,
      },
      select: {
        ...userPublic.select,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const subscriptions = (
      await subscriptionsForUser(session.userId, true)
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
  },
);
