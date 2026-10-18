import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

const DOCUMENT_FILE_EXTENSIONS = [
  ".txt",
  ".rtf",
  ".odt",
  ".docx",
  ".md",
  ".markdown",
  ".html",
  ".htm",
  ".org",
];

export const ImportTextfilesPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importTextfiles.title")}
      description={t("pages.importTextfiles.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/textfiles"
      accept=".zip"
      acceptableFiletypes=".zip"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      requireAiConsent
      showFileTypeWarning={(file) => !file.name.toLowerCase().endsWith(".zip")}
      singleFile={{
        isSingleFile: (file) => {
          const fileName = file.name.toLowerCase();
          return DOCUMENT_FILE_EXTENSIONS.some((extension) =>
            fileName.endsWith(extension),
          );
        },
        message: t("pages.importTextfiles.singleDocument"),
        toPendingShare: (file) => ({ kind: "document", file }),
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importTextfiles(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
