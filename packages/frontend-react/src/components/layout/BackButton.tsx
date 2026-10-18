import {
  useCanGoBack,
  useNavigate,
  useRouter,
  type NavigateOptions,
} from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const BackButton = ({ fallback }: { fallback: NavigateOptions }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const navigate = useNavigate();
  const canGoBack = useCanGoBack();

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="text-inherit hover:bg-white/10 hover:text-inherit"
      aria-label={t("generic.back")}
      onClick={() => {
        if (canGoBack) {
          router.history.back();
          return;
        }
        void navigate({ ...fallback, replace: true });
      }}
    >
      <ArrowLeftIcon className="size-6 rtl:rotate-180" />
    </Button>
  );
};
