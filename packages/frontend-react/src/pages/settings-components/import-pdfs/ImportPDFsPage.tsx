import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportPDFsPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importPDFs.title")}
      description={t("pages.importPDFs.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/pdfs"
      accept=".zip"
      acceptableFiletypes=".zip"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      requireAiConsent
      showFileTypeWarning={(file) => !file.name.toLowerCase().endsWith(".zip")}
      singleFile={{
        isSingleFile: (file) => {
          if (file.type === "application/pdf") return true;
          return file.name.toLowerCase().endsWith(".pdf");
        },
        message: t("pages.importPDFs.singlePdf"),
        toPendingShare: (file) => ({ kind: "document", file }),
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importPDFs(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
