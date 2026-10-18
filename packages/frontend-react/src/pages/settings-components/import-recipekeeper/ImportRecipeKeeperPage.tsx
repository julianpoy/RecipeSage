import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportRecipeKeeperPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importRecipeKeeper.title")}
      description={t("pages.importRecipeKeeper.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/recipe-keeper"
      accept=".zip"
      acceptableFiletypes=".zip"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) => {
        return !file.name.toLowerCase().endsWith(".zip");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importRecipekeeper(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
