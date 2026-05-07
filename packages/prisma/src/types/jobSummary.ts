import type { Prisma } from "../prisma/generated/client";
import { z } from "zod";

export const jobSummary = {
  select: {
    id: true,
    status: true,
    type: true,
    userId: true,
    resultCode: true,
    progress: true,
    meta: true,
    createdAt: true,
    updatedAt: true,
  },
} satisfies Prisma.JobFindFirstArgs;

export interface JobMeta {
  importType?:
    | "lcb"
    | "fdxz"
    | "textFiles"
    | "pepperplate"
    | "recipekeeper"
    | "paprika"
    | "cookmate"
    | "jsonld"
    | "csv"
    | "urls"
    | "pdfs"
    | "images"
    | "enex"
    | "copymethat";
  importLabels?: string[];
  importStorageKey?: string;
  importStorageBucket?: string;
  options?: {
    excludeImages?: boolean;
    includeStockRecipes?: boolean;
    includeTechniques?: boolean;
  };
  exportType?: "txt" | "jsonld" | "pdf";
  exportScope?: "all" | "recipeids";
  exportStorageBucket?: string;
  exportDownloadUrl?: string;
  exportStorageKey?: string;
  recipeIds?: string[];
}

export type JobSummary = Omit<
  Prisma.JobGetPayload<typeof jobSummary>,
  "meta"
> & {
  meta?: JobMeta;
};

export const prismaJobSummaryToJobSummary = (
  _jobSummary: Prisma.JobGetPayload<typeof jobSummary>,
) => {
  return _jobSummary as JobSummary;
};

const jobMetaSchema = z
  .object({
    importType: z
      .enum([
        "lcb",
        "fdxz",
        "textFiles",
        "pepperplate",
        "recipekeeper",
        "paprika",
        "cookmate",
        "jsonld",
        "csv",
        "urls",
        "pdfs",
        "images",
        "enex",
        "copymethat",
      ])
      .optional(),
    importLabels: z.array(z.string()).optional(),
    importStorageKey: z.string().optional(),
    importStorageBucket: z.string().optional(),
    options: z
      .object({
        excludeImages: z.boolean().optional(),
        includeStockRecipes: z.boolean().optional(),
        includeTechniques: z.boolean().optional(),
      })
      .optional(),
    exportType: z.enum(["txt", "jsonld", "pdf"]).optional(),
    exportScope: z.enum(["all", "recipeids"]).optional(),
    exportStorageBucket: z.string().optional(),
    exportDownloadUrl: z.string().optional(),
    exportStorageKey: z.string().optional(),
    recipeIds: z.array(z.string()).optional(),
  })
  .optional();

export const jobSummarySchema = z.object({
  id: z.uuid(),
  status: z.enum(["CREATE", "RUN", "FAIL", "SUCCESS"]),
  type: z.enum(["IMPORT", "EXPORT"]),
  userId: z.uuid(),
  resultCode: z.number().int().nullable(),
  progress: z.number().int(),
  meta: jobMetaSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof jobSummarySchema
> satisfies JobSummary;
const _checkTypeSatisfiesSchema = {} as JobSummary satisfies z.infer<
  typeof jobSummarySchema
>;
