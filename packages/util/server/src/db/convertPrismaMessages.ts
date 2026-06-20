import type { PrismaMessageSummary, MessageSummary } from "@recipesage/prisma";

export const convertPrismaMessageToMessageSummary = (
  message: PrismaMessageSummary,
): MessageSummary => ({
  ...message,
  body: message.body ?? "",
});

export const convertPrismaMessagesToMessageSummaries = (
  messages: PrismaMessageSummary[],
): MessageSummary[] => messages.map(convertPrismaMessageToMessageSummary);
