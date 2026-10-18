import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ErrorHandlers } from "../../../services/httpErrorHandler";
import type { UploadProgressHandler } from "../../../services/httpService";
import {
  pendingShareService,
  type PendingShare,
} from "../../../services/pendingShareService";
import { thirdPartyAiConsentService } from "../../../services/thirdPartyAiConsentService";
import { ImportPageLayout } from "./ImportPageLayout";
import { ImportStep } from "./ImportStep";
import { useImportJobCreated } from "./useImportJobCreated";

export interface ImportFileSingleFileOption {
  isSingleFile: (file: File) => boolean;
  message: string;
  toPendingShare: (file: File) => PendingShare;
}

export const ImportFilePage = ({
  title,
  description,
  docsUrl,
  accept,
  acceptableFiletypes,
  maxFileSizeMb,
  showFileTypeWarning,
  requireAiConsent = false,
  singleFile,
  options,
  upload,
}: {
  title: string;
  description: ReactNode;
  docsUrl: string;
  accept: string;
  acceptableFiletypes: string;
  maxFileSizeMb: number;
  showFileTypeWarning: (file: File) => boolean;
  requireAiConsent?: boolean;
  singleFile?: ImportFileSingleFileOption;
  options?: (file: File | undefined) => ReactNode;
  upload: (
    file: File,
    errorHandlers: ErrorHandlers,
    onUploadProgress: UploadProgressHandler,
  ) => Promise<{ success: boolean }>;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const onImportJobCreated = useImportJobCreated();
  const filePickerRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File>();
  const [fileRejectedAsTooLarge, setFileRejectedAsTooLarge] = useState(false);
  const [progress, setProgress] = useState<number>();

  const isFileTooLarge =
    fileRejectedAsTooLarge ||
    (!!file && file.size / 1024 / 1024 > maxFileSizeMb);
  const fileTypeWarning = !!file && !!file.name && showFileTypeWarning(file);
  const isSingleFile = !!file && !!singleFile && singleFile.isSingleFile(file);

  const createRecipeFromSingleFile = async () => {
    if (!file || !singleFile) return;

    pendingShareService.set(singleFile.toPendingShare(file));
    await navigate({
      to: "/edit-recipe/$recipeId",
      params: { recipeId: "new" },
    });
  };

  const submit = async () => {
    if (!file || isSingleFile) return;
    if (requireAiConsent && !(await thirdPartyAiConsentService.ensureConsent()))
      return;

    const response = await upload(
      file,
      {
        413: () => {
          setFileRejectedAsTooLarge(true);
        },
      },
      (event) => {
        setProgress(event.progress ?? 0);
      },
    );
    setProgress(undefined);

    if (!response.success) return;

    await onImportJobCreated();
  };

  return (
    <ImportPageLayout title={title} description={description} docsUrl={docsUrl}>
      <input
        ref={filePickerRef}
        type="file"
        className="hidden"
        accept={accept}
        onChange={(event) => {
          const files = event.target.files;
          if (!files || files.length === 0) return;

          setFile(files[0]);
          setFileRejectedAsTooLarge(false);
        }}
      />

      <ImportStep number={1} disabled={progress !== undefined}>
        <Button
          variant="outline"
          size="lg"
          className="h-auto min-h-10 max-w-full py-2 whitespace-normal break-all"
          onClick={() => filePickerRef.current?.click()}
        >
          {file
            ? t("pages.import.filePicker.file", { fileName: file.name })
            : t("pages.import.filePicker.noFile", { acceptableFiletypes })}
        </Button>

        {isSingleFile && singleFile ? (
          <div className="flex flex-col items-start gap-3">
            <p>{singleFile.message}</p>
            <Button size="lg" onClick={() => void createRecipeFromSingleFile()}>
              {t("pages.import.goToCreateRecipePage")}
            </Button>
          </div>
        ) : (
          fileTypeWarning && (
            <p>{t("pages.import.fileTypeWarning", { acceptableFiletypes })}</p>
          )
        )}
        {isFileTooLarge && (
          <p>
            <b>{t("pages.import.fileTooLarge")}</b>
          </p>
        )}
      </ImportStep>

      <ImportStep
        number={2}
        disabled={
          !file || progress !== undefined || isFileTooLarge || isSingleFile
        }
      >
        {options?.(file)}
        <Button size="lg" onClick={() => void submit()}>
          {fileTypeWarning
            ? t("pages.import.upload.ignoreWarning")
            : t("pages.import.upload")}
        </Button>
      </ImportStep>

      <ImportStep number={3} disabled={progress === undefined}>
        <div className="flex w-full flex-col gap-2">
          {progress === undefined
            ? t("pages.import.uploading.hint")
            : t("pages.import.uploading")}
          <Progress
            value={progress === undefined ? 0 : progress * 100}
            aria-label={t("pages.import.uploading")}
          />
        </div>
      </ImportStep>

      <ImportStep number={4} disabled>
        <div className="flex w-full flex-col gap-2">
          {t("pages.import.processing")}
          <Progress value={0} aria-label={t("pages.import.processing")} />
        </div>
      </ImportStep>
    </ImportPageLayout>
  );
};
