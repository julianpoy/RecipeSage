import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { ModalDialog } from "../dialogs/ModalDialog";
import type { DialogControls } from "../dialogs/openDialog";
import { PageContent } from "../layout/PageContent";
import { PageHeader } from "../layout/PageHeader";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export interface SearchableSelectModalProps {
  title?: string;
  options: SearchableSelectOption[];
  searchPlaceholder?: string;
  noResultsText?: string;
  selectedValue?: string;
}

export const SearchableSelectModal = ({
  controls,
  title = "",
  options,
  searchPlaceholder,
  noResultsText,
  selectedValue,
}: SearchableSelectModalProps & {
  controls: DialogControls<SearchableSelectOption>;
}) => {
  const { t } = useTranslation();
  const [searchText, setSearchText] = useState("");

  const query = searchText.trim().toLowerCase();
  const filteredOptions = query
    ? options.filter(
        (option) =>
          option.label.toLowerCase().includes(query) ||
          (option.sublabel?.toLowerCase().includes(query) ?? false),
      )
    : options;

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={title}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={() => controls.close()}
          >
            <XIcon className="size-6" />
          </Button>
        }
      >
        <div className="bg-background px-2 pt-2 pb-2 text-foreground">
          <InputGroup className="h-10">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              type="search"
              dir="auto"
              autoComplete="off"
              placeholder={
                searchPlaceholder ||
                t("components.searchableSelectModal.search")
              }
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </InputGroup>
        </div>
      </PageHeader>
      <PageContent padded={false}>
        <div role="list" className="flex flex-col">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                role="listitem"
                className="flex min-h-12 w-full items-center gap-4 border-b px-4 py-2 text-start hover:bg-muted"
                onClick={() => controls.close(option)}
              >
                <div className="min-w-0 flex-1">
                  <div dir="auto" className="text-base break-words">
                    {option.label}
                  </div>
                  {option.sublabel && (
                    <div
                      dir="auto"
                      className="text-sm break-words text-muted-foreground"
                    >
                      {option.sublabel}
                    </div>
                  )}
                </div>
                {option.value === selectedValue && (
                  <CheckIcon
                    className="size-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                )}
              </button>
            ))
          ) : (
            <div className="px-4 py-3 text-base break-words">
              {noResultsText || t("components.searchableSelectModal.noResults")}
            </div>
          )}
        </div>
      </PageContent>
    </ModalDialog>
  );
};
