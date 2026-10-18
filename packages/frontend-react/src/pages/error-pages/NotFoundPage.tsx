import { Link } from "@tanstack/react-router";
import { CompassIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../components/layout/PageHeader";
import { PageContent } from "../../components/layout/PageContent";
import { NullState } from "../../components/NullState";

export const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("pages.notfound.title")} />
      <PageContent>
        <NullState icon={<CompassIcon />}>
          <h2 className="mb-8 text-xl font-medium">
            {t("pages.notfound.error.title")}
          </h2>
          <p>
            {t("pages.notfound.error.message1")}
            <br />
            {t("pages.notfound.error.message2")}
            <br />
            {t("pages.notfound.error.message3")}
            <br />
            <br />
            <Link to="/about/contact" className="text-primary hover:underline">
              {t("pages.notfound.error.contact")}
            </Link>
            <br />
            <Link
              to="/list/$folder"
              params={{ folder: "main" }}
              className="text-primary hover:underline"
            >
              {t("pages.notfound.error.goHome")}
            </Link>
          </p>
        </NullState>
      </PageContent>
    </>
  );
};
