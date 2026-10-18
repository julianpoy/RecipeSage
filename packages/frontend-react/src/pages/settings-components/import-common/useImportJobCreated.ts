import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { showAlert } from "../../../components/dialogs/showAlert";

export const useImportJobCreated = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return async () => {
    await navigate({ to: "/settings/import", replace: true });

    await showAlert({
      header: t("pages.import.jobCreated.header"),
      message: t("pages.import.jobCreated.message"),
      buttons: [
        {
          text: t("generic.okay"),
        },
      ],
    });
  };
};
