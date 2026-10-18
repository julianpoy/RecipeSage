import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";

export const ImportPageLayout = ({
  title,
  description,
  docsUrl,
  children,
}: {
  title: string;
  description: ReactNode;
  docsUrl: string;
  children: ReactNode;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/settings/import" }} />}
        title={title}
      />
      <PageContent>
        <div className="mx-auto flex max-w-page flex-col gap-6">
          <p className="break-words">
            {description}
            <br />
            <br />
            <a
              href={docsUrl}
              target="_blank"
              rel="noopener"
              className="text-primary hover:underline"
            >
              {t("pages.import.viewDocumentation")}
            </a>
          </p>
          {children}
        </div>
      </PageContent>
    </>
  );
};
