import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { BackButton } from "../../../components/layout/BackButton";
import { LogoIcon } from "../../../components/LogoIcon";
import { capabilitiesStore } from "../../../stores/capabilitiesStore";

export const ContributeCancelPage = () => {
  const { t } = useTranslation();

  useEffect(() => {
    void capabilitiesStore.getState().updateCapabilities();
  }, []);

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/about" }} />}
        title={t("pages.contributeCancel.title")}
      />
      <PageContent className="text-center">
        <p className="mt-4 text-2xl">{t("pages.contributeCancel.title")}</p>

        <div className="mx-auto mt-12 flex max-w-content flex-col gap-4 text-sm">
          <Link to="/about" aria-label={t("pages.about.title")}>
            <LogoIcon />
          </Link>

          <p>{t("pages.contributeCancel.cta.1")}</p>
          <p className="mt-4">{t("pages.contributeCancel.cta.2")}</p>
          <p>{t("pages.contributeCancel.cta.3")}</p>
          <p>{t("pages.contributeCancel.cta.4")}</p>

          <div className="pb-6">
            <Link
              to="/contribute"
              className={buttonVariants({
                size: "lg",
                className: "h-auto min-h-11 px-6 py-3 whitespace-normal",
              })}
            >
              {t("pages.contributeCancel.contribute")}
            </Link>
          </div>
        </div>
      </PageContent>
    </>
  );
};
