import { JOB_RESULT_CODES } from "@recipesage/util/shared";

export const getImportJobResultCode = (args: {
  isBadFormat?: boolean;
  isNoRecipes?: boolean;
  isBadCredentials?: boolean;
}) => {
  if (args.isBadFormat) return JOB_RESULT_CODES.badFile;
  if (args.isNoRecipes) return JOB_RESULT_CODES.emptyFile;
  if (args.isBadCredentials) return JOB_RESULT_CODES.emptyFile;
  return JOB_RESULT_CODES.unknown;
};
