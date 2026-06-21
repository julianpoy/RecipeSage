import { publicProcedure } from "../../trpc";
import { capabilitiesForUser } from "@recipesage/util/server/capabilities";
import { Capabilities } from "@recipesage/util/shared";
import { z } from "zod";

export const getMyCapabilities = publicProcedure
  .meta({
    openapi: {
      method: "GET",
      path: "/users/getMyCapabilities",
      tags: ["users"],
      summary: "Get the caller's enabled subscription capabilities",
    },
  })
  .output(
    z.object({
      highResImages: z.boolean(),
      multipleImages: z.boolean(),
      expandablePreviews: z.boolean(),
      assistantMoreMessages: z.boolean(),
      moreUsageCredits: z.boolean(),
    }),
  )
  .query(async ({ ctx }) => {
    if (!ctx.session) {
      return {
        highResImages: false,
        multipleImages: false,
        expandablePreviews: false,
        assistantMoreMessages: false,
        moreUsageCredits: false,
      };
    }

    const userCapabilities = await capabilitiesForUser(ctx.session.userId);

    return {
      highResImages: userCapabilities.includes(Capabilities.HighResImages),
      multipleImages: userCapabilities.includes(Capabilities.MultipleImages),
      expandablePreviews: userCapabilities.includes(
        Capabilities.ExpandablePreviews,
      ),
      assistantMoreMessages: userCapabilities.includes(
        Capabilities.AssistantMoreMessages,
      ),
      moreUsageCredits: userCapabilities.includes(
        Capabilities.MoreUsageCredits,
      ),
    };
  });
