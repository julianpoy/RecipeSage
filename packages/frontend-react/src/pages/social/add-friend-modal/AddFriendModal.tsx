import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ExternalLinkIcon, SendIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { showAlert } from "../../../components/dialogs/showAlert";
import { showToast } from "../../../components/dialogs/showToast";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SelectUser } from "../../../components/select-user/SelectUser";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";

export const AddFriendModal = ({
  controls,
}: {
  controls: DialogControls<void>;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recipientId, setRecipientId] = useState<string>();

  const profileDisabledError = async () => {
    await showAlert({
      header: t("pages.addFriendModal.profileDisabled.header"),
      message: t("pages.addFriendModal.profileDisabled.message"),
      buttons: [
        {
          text: t("generic.okay"),
          handler: () => {
            void navigate({ to: "/people", replace: true });
          },
        },
      ],
    });
  };

  const loadRecipientProfile = async (id: string) => {
    const loading = loadingService.start();

    const profiles = await serverActions.users.getUserProfilesById({
      ids: [id],
    });

    loading.dismiss();

    return profiles?.[0];
  };

  const send = async () => {
    if (!recipientId) return;

    const profile = await loadRecipientProfile(recipientId);
    if (!profile) return;
    if (!profile.enableProfile) {
      void profileDisabledError();
      return;
    }

    const friendRequest = await serverActions.users.createFriendship({
      friendId: recipientId,
    });
    if (!friendRequest) return;

    controls.close();
    showToast({
      message: t("pages.addFriendModal.success"),
      duration: 5000,
    });
  };

  const open = async () => {
    if (!recipientId) return;

    const profile = await loadRecipientProfile(recipientId);
    if (!profile) return;
    if (!profile.enableProfile) {
      void profileDisabledError();
      return;
    }

    void navigate({
      to: "/people/$handle",
      params: { handle: `@${profile.handle}` },
    });
    controls.close();
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={t("pages.addFriendModal.title")}
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
      />
      <PageContent>
        <SelectUser
          suggestKnownUsers={false}
          onSelectedUserChange={(user) => setRecipientId(user?.id)}
        />
        <p className="border-b px-4 py-3 text-sm text-muted-foreground">
          {t("pages.addFriendModal.profileWarning")}
        </p>
      </PageContent>
      <PageFooter className="flex flex-wrap justify-center gap-2 p-4">
        <Button
          size="lg"
          className="grow basis-[45%]"
          disabled={!recipientId}
          onClick={() => void send()}
        >
          <SendIcon data-icon="inline-start" className="rtl:-scale-x-100" />
          {t("pages.addFriendModal.send")}
        </Button>
        <Button
          size="lg"
          className="grow basis-[45%]"
          disabled={!recipientId}
          onClick={() => void open()}
        >
          <ExternalLinkIcon data-icon="inline-start" />
          {t("pages.addFriendModal.open")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
