import { MenuIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { navMenuStore } from "./navMenuStore";

export const MenuButton = () => {
  const { t } = useTranslation();
  const splitPaneActive = navMenuStore((state) => state.splitPaneActive);
  const setOpen = navMenuStore((state) => state.setOpen);

  if (splitPaneActive) return null;

  return (
    <Button
      variant="ghost"
      size="icon-lg"
      className="text-inherit hover:bg-white/10 hover:text-inherit"
      aria-label={t("generic.menu")}
      onClick={() => setOpen(true)}
    >
      <MenuIcon className="size-6" />
    </Button>
  );
};
