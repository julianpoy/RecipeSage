import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { TextArea } from "../../../components/forms/TextArea";
import { importService } from "../../../services/importService";
import { ImportPageLayout } from "../import-common/ImportPageLayout";
import { useImportJobCreated } from "../import-common/useImportJobCreated";

export const ImportUrlsPage = () => {
  const { t } = useTranslation();
  const onImportJobCreated = useImportJobCreated();

  const [urls, setUrls] = useState("");

  const submit = async () => {
    const urlList = urls.split("\n").filter((el) => el.trim());

    const response = await importService.importUrls(urlList, undefined);

    if (!response.success) return;

    await onImportJobCreated();
  };

  return (
    <ImportPageLayout
      title={t("pages.importUrls.title")}
      description={t("pages.importUrls.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/urls"
    >
      <TextArea
        autoGrow
        label={t("pages.importUrls.urls")}
        helperText={t("pages.importUrls.urls.helperText")}
        value={urls}
        onValueChange={setUrls}
        autoComplete="off"
      />

      <div>
        <Button
          size="lg"
          disabled={!urls.trim().length}
          onClick={() => void submit()}
        >
          {t("generic.submit")}
        </Button>
      </div>
    </ImportPageLayout>
  );
};
