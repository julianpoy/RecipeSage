import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportCSVPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importCSV.title")}
      description={t("pages.importCSV.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/csv"
      accept=".csv"
      acceptableFiletypes=".csv"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) => {
        return !file.name.toLowerCase().endsWith(".csv");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importCSV(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
