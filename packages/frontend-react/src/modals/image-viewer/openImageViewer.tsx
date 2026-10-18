import { openDialog } from "../../components/dialogs/openDialog";
import { ImageViewer } from "./ImageViewer";

export const openImageViewer = (props: { imageUrls: string[] }) =>
  openDialog<void>((controls) => (
    <ImageViewer controls={controls} imageUrls={props.imageUrls} />
  ));
