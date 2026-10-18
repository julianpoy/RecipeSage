import { openDialog } from "../dialogs/openDialog";
import {
  SearchableSelectModal,
  type SearchableSelectModalProps,
  type SearchableSelectOption,
} from "./SearchableSelectModal";

export const openSearchableSelectModal = (props: SearchableSelectModalProps) =>
  openDialog<SearchableSelectOption>((controls) => (
    <SearchableSelectModal controls={controls} {...props} />
  ));
