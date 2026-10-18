import { useTranslation } from "react-i18next";

export const SelfhostWarningItem = () => {
  const { t } = useTranslation();

  return (
    <p className="px-4 py-3 text-sm">
      {t("components.selfhostWarning.1")}{" "}
      <a
        href="https://recipesage.com"
        target="_blank"
        rel="noreferrer noopener"
        className="text-primary hover:underline"
      >
        RecipeSage.com
      </a>{" "}
      {t("components.selfhostWarning.2")}
    </p>
  );
};
