import type {
  ImageFindFirstArgs,
  ImageGetPayload,
} from "../prisma/generated/models";
import { z } from "zod";

export const imageSummary = {
  select: {
    id: true,
    location: true,
  },
} satisfies ImageFindFirstArgs;

export type ImageSummary = ImageGetPayload<typeof imageSummary>;

export const imageSummarySchema = z.object({
  id: z.uuid(),
  location: z.string(),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof imageSummarySchema
> satisfies ImageSummary;
const _checkTypeSatisfiesSchema = {} as ImageSummary satisfies z.infer<
  typeof imageSummarySchema
>;
