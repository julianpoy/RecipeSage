import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportCookmatePage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importCookmate.title")}
      description={t("pages.importCookmate.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/cookmate"
      accept=".mcb"
      acceptableFiletypes=".mcb"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) => {
        return !file.name.toLowerCase().endsWith(".mcb");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importCookmate(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
