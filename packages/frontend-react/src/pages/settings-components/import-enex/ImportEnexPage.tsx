import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportEnexPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importEnex.title")}
      description={t("pages.importEnex.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/evernote"
      accept=".enex"
      acceptableFiletypes=".enex"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      requireAiConsent
      showFileTypeWarning={(file) => {
        return !file.name.toLowerCase().endsWith(".enex");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importEnex(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
