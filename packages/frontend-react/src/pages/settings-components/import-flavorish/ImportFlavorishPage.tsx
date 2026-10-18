import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportFlavorishPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importFlavorish.title")}
      description={t("pages.importFlavorish.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/flavorish"
      accept=".zip"
      acceptableFiletypes=".zip"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) => {
        return !file.name.toLowerCase().endsWith(".zip");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importFlavorish(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
