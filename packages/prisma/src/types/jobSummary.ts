import { JobType, type Prisma } from "../prisma/generated/client";
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

export const importJobMetaSchema = z.object({
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
      "mela",
      "crouton",
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
  language: z.string().max(254).optional(),
});

export const exportJobMetaSchema = z.object({
  exportType: z.enum(["txt", "jsonld", "pdf"]).optional(),
  exportScope: z.enum(["all", "recipeids"]).optional(),
  exportStorageBucket: z.string().optional(),
  exportStorageKey: z.string().optional(),
  exportDownloadUrl: z.string().optional(),
  recipeIds: z.array(z.string()).optional(),
  language: z.string().max(254).optional(),
});

export const cookbookJobMetaSchema = z.object({
  cookbookTitle: z.string().optional(),
  cookbookSubtitle: z.string().optional(),
  cookbookIntroduction: z.string().optional(),
  cookbookAuthor: z.string().optional(),
  cookbookIncludeToc: z.boolean().optional(),
  cookbookIncludeImages: z.boolean().optional(),
  cookbookIncludeLabels: z.boolean().optional(),
  cookbookStorageBucket: z.string().optional(),
  cookbookStorageKey: z.string().optional(),
  cookbookDownloadUrl: z.string().optional(),
  recipeIds: z.array(z.string()).optional(),
  language: z.string().max(254).optional(),
});

export type ImportJobMeta = z.infer<typeof importJobMetaSchema>;
export type ExportJobMeta = z.infer<typeof exportJobMetaSchema>;
export type CookbookJobMeta = z.infer<typeof cookbookJobMetaSchema>;
export type JobMeta = ImportJobMeta | ExportJobMeta | CookbookJobMeta;

type JobSummaryBase = Omit<
  Prisma.JobGetPayload<typeof jobSummary>,
  "meta" | "type"
>;

export type ImportJobSummary = JobSummaryBase & {
  type: typeof JobType.IMPORT;
  meta: ImportJobMeta;
};
export type ExportJobSummary = JobSummaryBase & {
  type: typeof JobType.EXPORT;
  meta: ExportJobMeta;
};
export type CookbookJobSummary = JobSummaryBase & {
  type: typeof JobType.COOKBOOK;
  meta: CookbookJobMeta;
};

export type JobSummary =
  | ImportJobSummary
  | ExportJobSummary
  | CookbookJobSummary;

export const prismaJobSummaryToJobSummary = (
  _jobSummary: Prisma.JobGetPayload<typeof jobSummary>,
): JobSummary => {
  const { meta, type, ...rest } = _jobSummary;

  switch (type) {
    case JobType.IMPORT: {
      return {
        ...rest,
        type: JobType.IMPORT,
        meta: importJobMetaSchema.parse(meta ?? {}),
      };
    }
    case JobType.EXPORT: {
      return {
        ...rest,
        type: JobType.EXPORT,
        meta: exportJobMetaSchema.parse(meta ?? {}),
      };
    }
    case JobType.COOKBOOK: {
      return {
        ...rest,
        type: JobType.COOKBOOK,
        meta: cookbookJobMetaSchema.parse(meta ?? {}),
      };
    }
  }
};

const importJobSummarySchema = z.object({
  id: z.uuid(),
  status: z.enum(["CREATE", "RUN", "FAIL", "SUCCESS"]),
  type: z.literal(JobType.IMPORT),
  userId: z.uuid(),
  resultCode: z.number().int().nullable(),
  progress: z.number().int(),
  meta: importJobMetaSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const exportJobSummarySchema = z.object({
  id: z.uuid(),
  status: z.enum(["CREATE", "RUN", "FAIL", "SUCCESS"]),
  type: z.literal(JobType.EXPORT),
  userId: z.uuid(),
  resultCode: z.number().int().nullable(),
  progress: z.number().int(),
  meta: exportJobMetaSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

const cookbookJobSummarySchema = z.object({
  id: z.uuid(),
  status: z.enum(["CREATE", "RUN", "FAIL", "SUCCESS"]),
  type: z.literal(JobType.COOKBOOK),
  userId: z.uuid(),
  resultCode: z.number().int().nullable(),
  progress: z.number().int(),
  meta: cookbookJobMetaSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const jobSummarySchema = z.union([
  importJobSummarySchema,
  exportJobSummarySchema,
  cookbookJobSummarySchema,
]);

const _checkSchemaSatisfiesType = {} as z.infer<
  typeof jobSummarySchema
> satisfies JobSummary;
const _checkTypeSatisfiesSchema = {} as JobSummary satisfies z.infer<
  typeof jobSummarySchema
>;
