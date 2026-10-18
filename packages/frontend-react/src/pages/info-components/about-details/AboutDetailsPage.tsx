import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { BackButton } from "../../../components/layout/BackButton";
import { SocialLinks } from "../../../components/social-links/SocialLinks";

export const AboutDetailsPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/about" }} />}
        title={t("pages.aboutDetails.title")}
      />
      <PageContent>
        <div className="mx-auto flex max-w-page flex-col gap-4">
          <p>
            <b>{t("pages.aboutDetails.1.title")}</b>
          </p>
          <p>{t("pages.aboutDetails.1.1")}</p>
          <p>{t("pages.aboutDetails.1.2")}</p>

          <p className="mt-4">
            <b>{t("pages.aboutDetails.2.title")}</b>
          </p>
          <p>{t("pages.aboutDetails.2.1")}</p>
          <p>{t("pages.aboutDetails.2.2")}</p>
          <p>
            {t("pages.aboutDetails.2.3")}{" "}
            <Link
              to="/contribute"
              className="text-primary underline-offset-4 hover:underline"
            >
              {t("pages.aboutDetails.contribute")}
            </Link>
          </p>

          <p className="mt-4">
            <b>{t("pages.aboutDetails.social")}</b>
          </p>
          <SocialLinks />
        </div>
      </PageContent>
    </>
  );
};
