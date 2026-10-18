import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportMelaPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importMela.title")}
      description={t("pages.importMela.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/mela"
      accept=".melarecipes,.melarecipe"
      acceptableFiletypes=".melarecipes, .melarecipe"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) => {
        const name = file.name.toLowerCase();
        return !name.endsWith(".melarecipes") && !name.endsWith(".melarecipe");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importMela(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
