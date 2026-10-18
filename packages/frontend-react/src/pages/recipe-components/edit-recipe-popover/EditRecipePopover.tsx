import { useTranslation } from "react-i18next";
import { ImageIcon, SlidersHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const EditRecipePopover = ({
  canAddImages,
  addImageByUrlPrompt,
}: {
  canAddImages: boolean;
  addImageByUrlPrompt: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
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
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {t("pages.editRecipePopover.actions")}
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="min-h-10"
            disabled={!canAddImages}
            onClick={addImageByUrlPrompt}
          >
            <ImageIcon />
            {t("pages.editRecipePopover.addImage")}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
