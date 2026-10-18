import type { SupportedFontSize } from "@recipesage/util/shared";
import { openDialog } from "../dialogs/openDialog";
import { FontSizeModal } from "./FontSizeModal";

export const openFontSizeModal = (props: { fontSize?: SupportedFontSize }) =>
  openDialog<SupportedFontSize>((controls) => (
    <FontSizeModal controls={controls} fontSize={props.fontSize} />
  ));
