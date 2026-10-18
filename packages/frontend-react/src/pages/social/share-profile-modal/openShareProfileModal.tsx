import { openDialog } from "../../../components/dialogs/openDialog";
import {
  ShareProfileModal,
  type ShareProfileModalProfile,
} from "./ShareProfileModal";

export const openShareProfileModal = (props: {
  profile: ShareProfileModalProfile;
}) =>
  openDialog<void>((controls) => (
    <ShareProfileModal controls={controls} profile={props.profile} />
  ));
