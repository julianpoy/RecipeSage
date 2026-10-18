import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export const useLabeledPageTitle = (title: string | undefined) => {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    if (title === undefined) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      document.title = t("generic.labeledPageTitle", { title });
    });
    return () => {
      cancelled = true;
    };
  }, [title, t, i18n.language]);
};
