import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

export const ImportCookbookManagerComPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importCookbookManagerCom.title")}
      description={t("pages.importCookbookManagerCom.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/cookbookmanagercom"
      accept=".zip"
      acceptableFiletypes=".zip"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) => {
        return !file.name.toLowerCase().endsWith(".zip");
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importCookbookManagerCom(
          file,
          errorHandlers,
          onUploadProgress,
        )
      }
    />
  );
};
