import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { BackButton } from "../../../components/layout/BackButton";
import { LogoIcon } from "../../../components/LogoIcon";
import { capabilitiesStore } from "../../../stores/capabilitiesStore";

export const ContributeThankYouPage = () => {
  const { t } = useTranslation();

  useEffect(() => {
    void capabilitiesStore.getState().updateCapabilities();
  }, []);

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/about" }} />}
        title={t("pages.contributeThankYou.title")}
      />
      <PageContent className="text-center">
        <p className="mt-4 text-2xl">{t("pages.contributeThankYou.title")}</p>

        <div className="mx-auto mt-12 flex max-w-content flex-col gap-4 text-sm">
          <Link to="/about" aria-label={t("pages.about.title")}>
            <LogoIcon />
          </Link>

          <p>{t("pages.contributeThankYou.thanks")}</p>

          <p>
            <Link
              to="/settings/account"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("pages.contributeThankYou.bonus")}
            </Link>
          </p>

          <p className="mt-4">{t("pages.contributeThankYou.questions")}</p>

          <p className="mt-4 pb-6">
            <i>- Julian</i>
          </p>
        </div>
      </PageContent>
    </>
  );
};
