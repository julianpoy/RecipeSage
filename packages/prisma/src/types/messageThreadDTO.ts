import { z } from "zod";
import { userPublicSchema } from "./userPublic";
import { messageSummarySchema } from "./messageSummary";

export const messageThreadDTOSchema = z.object({
  otherUser: userPublicSchema,
  latestMessage: messageSummarySchema.nullable(),
});

export type MessageThreadDTO = z.infer<typeof messageThreadDTOSchema>;
