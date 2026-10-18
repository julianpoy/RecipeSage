import { useTranslation } from "react-i18next";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

const IMAGE_FILE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".heic",
  ".heif",
  ".avif",
];

export const ImportImagesPage = () => {
  const { t } = useTranslation();

  return (
    <ImportFilePage
      title={t("pages.importImages.title")}
      description={t("pages.importImages.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/images"
      accept=".zip"
      acceptableFiletypes=".zip"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      requireAiConsent
      showFileTypeWarning={(file) => !file.name.toLowerCase().endsWith(".zip")}
      singleFile={{
        isSingleFile: (file) => {
          if (file.type.startsWith("image/")) return true;
          const fileName = file.name.toLowerCase();
          return IMAGE_FILE_EXTENSIONS.some((extension) =>
            fileName.endsWith(extension),
          );
        },
        message: t("pages.importImages.singleImage"),
        toPendingShare: (file) => ({ kind: "images", files: [file] }),
      }}
      upload={(file, errorHandlers, onUploadProgress) =>
        importService.importImages(file, errorHandlers, onUploadProgress)
      }
    />
  );
};
