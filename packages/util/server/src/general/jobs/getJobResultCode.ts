import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import {
  ImportBadCredentialsError,
  ImportBadFormatError,
  ImportNoRecipesError,
  ImportTooManyRecipesError,
} from "./jobErrors";
import { ImportStandardizedRecipesTooManyRecipesError } from "../../db/importStandardizedRecipes";
import {
  ZipMalformedError,
  ZipTooLargeError,
  ZipUnsafePathError,
} from "../safeExtractZip";

export const jobErrorsToReport: (typeof JOB_RESULT_CODES)[keyof typeof JOB_RESULT_CODES][] =
  [JOB_RESULT_CODES.unknown];

export const jobErrorToResultCode = (error: unknown) => {
  if (!(error instanceof Error)) return JOB_RESULT_CODES.unknown;

  if (
    error instanceof ImportBadFormatError ||
    error instanceof ZipMalformedError ||
    error instanceof ZipTooLargeError ||
    error instanceof ZipUnsafePathError
  ) {
    return JOB_RESULT_CODES.badFile;
  }

  if (error instanceof ImportNoRecipesError) {
    return JOB_RESULT_CODES.emptyFile;
  }

  if (error instanceof ImportBadCredentialsError) {
    return JOB_RESULT_CODES.badCredentials;
  }

  if (
    error instanceof ImportStandardizedRecipesTooManyRecipesError ||
    error instanceof ImportTooManyRecipesError
  ) {
    return JOB_RESULT_CODES.tooManyRecipes;
  }

  return JOB_RESULT_CODES.unknown;
};
