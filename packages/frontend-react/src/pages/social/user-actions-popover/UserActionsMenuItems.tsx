import { useTranslation } from "react-i18next";
import { BanIcon, FlagIcon } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export type UserActionsPopoverAction = "report" | "block" | "unblock";

export const UserActionsMenuItems = ({
  isBlockedByMe = false,
  onAction,
}: {
  isBlockedByMe?: boolean;
  onAction: (action: UserActionsPopoverAction) => void;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <DropdownMenuItem
        variant="destructive"
        className="min-h-10"
        onClick={() => onAction("report")}
      >
        <FlagIcon />
        {t("pages.userActionsPopover.report")}
      </DropdownMenuItem>
      {isBlockedByMe ? (
        <DropdownMenuItem
          className="min-h-10"
          onClick={() => onAction("unblock")}
        >
          <BanIcon />
          {t("pages.userActionsPopover.unblock")}
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          variant="destructive"
          className="min-h-10"
          onClick={() => onAction("block")}
        >
          <BanIcon />
          {t("pages.userActionsPopover.block")}
        </DropdownMenuItem>
      )}
    </>
  );
};
