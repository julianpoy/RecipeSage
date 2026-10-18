import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportPaprikaPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importPaprika.title")}
      description={t("pages.importPaprika.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/paprika"
      accept=".paprikarecipes"
      acceptableFiletypes=".paprikarecipes"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) => {
        return !file.name.toLowerCase().endsWith(".paprikarecipes");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importPaprika(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
