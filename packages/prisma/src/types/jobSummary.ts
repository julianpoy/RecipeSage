import { Prisma } from "@prisma/client";

export const jobSummary = Prisma.validator<Prisma.JobFindFirstArgs>()({
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
});

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
  exportType?: "txt" | "jsonld" | "pdf";
  exportScope?: "all" | "recipeids";
  exportStorageBucket?: string;
  exportDownloadUrl?: string;
  exportStorageKey?: string;
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
