import { openDialog } from "../../components/dialogs/openDialog";
import { ShareModal, type ShareModalRecipe } from "./ShareModal";

export const openShareModal = (props: { recipe: ShareModalRecipe }) =>
  openDialog<void>((controls) => (
    <ShareModal controls={controls} recipe={props.recipe} />
  ));
