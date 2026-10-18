import { TriangleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { IS_SELFHOST } from "../../environments/environment";
import { PageHeader } from "../../components/layout/PageHeader";
import { PageContent } from "../../components/layout/PageContent";
import { NullState } from "../../components/NullState";

export const RouteErrorPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("generic.error")} />
      <PageContent>
        <NullState icon={<TriangleAlertIcon />}>
          <p className="mb-6">
            {IS_SELFHOST
              ? t("errors.unexpected.selfhost")
              : t("errors.unexpected")}
          </p>
          <Button size="lg" onClick={() => window.location.reload()}>
            {t("generic.reload")}
          </Button>
        </NullState>
      </PageContent>
    </>
  );
};
