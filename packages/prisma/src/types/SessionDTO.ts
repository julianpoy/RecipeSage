import { z } from "zod";

export interface SessionDTO {
  token: string;
  userId: string;
  email: string;
  isNewUser?: boolean;
}

export const sessionDTOSchema = z.object({
  token: z.string(),
  userId: z.uuid(),
  email: z.string(),
  isNewUser: z.boolean().optional(),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof sessionDTOSchema
> satisfies SessionDTO;
const _checkTypeSatisfiesSchema = {} as SessionDTO satisfies z.infer<
  typeof sessionDTOSchema
>;
