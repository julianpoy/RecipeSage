import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { importService } from "../../../services/importService";
import { ImportFilePage } from "../import-common/ImportFilePage";

const MAX_FILE_SIZE_MB = 3000;

const isLCB = (file: File | undefined) =>
  !!file?.name.toLowerCase().endsWith(".lcb");

const isFDX = (file: File | undefined) =>
  !!file?.name.toLowerCase().endsWith(".fdx");

const isFDXZ = (file: File | undefined) =>
  !!file?.name.toLowerCase().endsWith(".fdxz");

const OptionCheckbox = ({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
}) => (
  <Label className="flex min-h-8 cursor-pointer items-center gap-3 text-base font-normal">
    <Checkbox checked={checked} onCheckedChange={onCheckedChange} />
    {children}
  </Label>
);

export const ImportLivingcookbookPage = () => {
  const { t } = useTranslation();

  const [options, setOptions] = useState({
    excludeImages: false,
    includeStockRecipes: false,
    includeTechniques: false,
  });

  return (
    <ImportFilePage
      title={t("pages.importLivingCookbook.title")}
      description={t("pages.importLivingCookbook.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/livingcookbook"
      accept=".lcb,.fdx,.fdxz"
      acceptableFiletypes=".lcb, .fdx, .fdxz"
      maxFileSizeMb={MAX_FILE_SIZE_MB}
      showFileTypeWarning={(file) =>
        !isLCB(file) && !isFDX(file) && !isFDXZ(file)
      }
      options={(file) => (
        <div className="flex flex-col gap-2">
          <OptionCheckbox
            checked={options.excludeImages}
            onCheckedChange={(excludeImages) =>
              setOptions((prev) => ({ ...prev, excludeImages }))
            }
          >
            {t("pages.importLivingCookbook.excludeImages")}
          </OptionCheckbox>
          {isLCB(file) && (
            <OptionCheckbox
              checked={options.includeStockRecipes}
              onCheckedChange={(includeStockRecipes) =>
                setOptions((prev) => ({ ...prev, includeStockRecipes }))
              }
            >
              {t("pages.importLivingCookbook.includeStock")}
            </OptionCheckbox>
          )}
          {isLCB(file) && (
            <OptionCheckbox
              checked={options.includeTechniques}
              onCheckedChange={(includeTechniques) =>
                setOptions((prev) => ({ ...prev, includeTechniques }))
              }
            >
              {t("pages.importLivingCookbook.includeTechniques")}
            </OptionCheckbox>
          )}
        </div>
      )}
      upload={(file, errorHandlers, onUploadProgress) => {
        if (isFDXZ(file) || isFDX(file)) {
          return importService.importFdxz(
            file,
            options,
            errorHandlers,
            onUploadProgress,
          );
        }

        return importService.importLivingcookbook(
          file,
          options,
          errorHandlers,
          onUploadProgress,
        );
      }}
    />
  );
};
