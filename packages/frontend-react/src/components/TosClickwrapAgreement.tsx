import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const TosClickwrapAgreement = ({
  onNavigate,
}: {
  onNavigate?: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <p className="text-sm italic">
      {t("components.tos.warning")}{" "}
      <Link
        to="/legal"
        className="text-primary underline-offset-4 hover:underline"
        onClick={onNavigate}
      >
        {t("components.tos.title")}
      </Link>
    </p>
  );
};
