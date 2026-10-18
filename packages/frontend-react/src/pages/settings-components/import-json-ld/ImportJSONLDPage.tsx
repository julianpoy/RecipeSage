import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 128;

export const ImportJSONLDPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importJsonLD.title")}
      description={t("pages.importJsonLD.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/json-ld"
      accept=".json"
      acceptableFiletypes=".json"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) => {
        return !file.name.toLowerCase().endsWith(".json");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importJsonLD(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
