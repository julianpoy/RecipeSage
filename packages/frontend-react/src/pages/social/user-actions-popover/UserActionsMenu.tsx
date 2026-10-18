import { useTranslation } from "react-i18next";
import { SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  UserActionsMenuItems,
  type UserActionsPopoverAction,
} from "./UserActionsMenuItems";

export const UserActionsMenu = ({
  isBlockedByMe = false,
  disabled = false,
  onAction,
}: {
  isBlockedByMe?: boolean;
  disabled?: boolean;
  onAction: (action: UserActionsPopoverAction) => void;
}) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.options")}
          />
        }
      >
        <SlidersHorizontalIcon className="size-6" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <UserActionsMenuItems
          isBlockedByMe={isBlockedByMe}
          onAction={onAction}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
