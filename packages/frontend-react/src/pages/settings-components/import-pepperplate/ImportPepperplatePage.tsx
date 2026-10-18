import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { showAlert } from "../../../components/dialogs/showAlert";
import { TextField } from "../../../components/forms/TextField";
import { importService } from "../../../services/importService";
import { loadingService } from "../../../services/loadingService";
import { ImportPageLayout } from "../import-common/ImportPageLayout";
import { useImportJobCreated } from "../import-common/useImportJobCreated";

export const ImportPepperplatePage = () => {
  const { t } = useTranslation();
  const onImportJobCreated = useImportJobCreated();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const alertIncorrectCredentials = () =>
    showAlert({
      header: t("pages.importPepperplate.incorrectCredentials.header"),
      message: t("pages.importPepperplate.incorrectCredentials.message"),
      buttons: [
        {
          text: t("generic.okay"),
        },
      ],
    });

  const submit = async () => {
    const loading = loadingService.start();
    const response = await importService.importPepperplate(
      {
        username,
        password,
      },
      {
        406: () => alertIncorrectCredentials(),
      },
    );
    loading.dismiss();

    if (!response.success) return;

    await onImportJobCreated();
  };

  return (
    <ImportPageLayout
      title={t("pages.importPepperplate.title")}
      description={t("pages.importPepperplate.description")}
      docsUrl="https://docs.recipesage.com/docs/tutorials/settings/import/pepperplate"
    >
      <TextField
        label={t("pages.importPepperplate.username")}
        helperText={t("pages.importPepperplate.username.helperText")}
        value={username}
        onValueChange={setUsername}
        autoComplete="off"
      />

      <TextField
        label={t("pages.importPepperplate.password")}
        helperText={t("pages.importPepperplate.password.helperText")}
        value={password}
        onValueChange={setPassword}
        type="password"
        autoComplete="off"
      />

      <div>
        <Button size="lg" onClick={() => void submit()}>
          {t("generic.submit")}
        </Button>
      </div>
    </ImportPageLayout>
  );
};
