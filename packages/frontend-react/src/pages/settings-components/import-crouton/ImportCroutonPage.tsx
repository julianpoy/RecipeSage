import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportCroutonPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importCrouton.title")}
      description={t("pages.importCrouton.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/crouton"
      accept=".zip"
      acceptableFiletypes=".zip"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) => {
        return !file.name.toLowerCase().endsWith(".zip");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importCrouton(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
