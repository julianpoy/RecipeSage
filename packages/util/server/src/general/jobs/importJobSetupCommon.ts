import { JobStatus, JobType } from "@recipesage/prisma";
import { prisma, type ImportJobMeta } from "@recipesage/prisma";
import { cleanLabelTitle } from "@recipesage/util/shared";

export async function importJobSetupCommon(args: {
  importType: ImportJobMeta["importType"];
  labels: string[];
  userId: string;
  language: string;
  excludeImages?: boolean;
  includeStockRecipes?: boolean;
  includeTechniques?: boolean;
}) {
  const job = await prisma.job.create({
    data: {
      userId: args.userId,
      type: JobType.IMPORT,
      status: JobStatus.CREATE,
      progress: 1,
      meta: {
        importType: args.importType,
        importLabels: args.labels.map((label) => cleanLabelTitle(label)),
        options: {
          excludeImages: args.excludeImages,
          includeStockRecipes: args.includeStockRecipes,
          includeTechniques: args.includeTechniques,
        },
        language: args.language,
      } satisfies ImportJobMeta,
    },
  });

  return { job };
}
