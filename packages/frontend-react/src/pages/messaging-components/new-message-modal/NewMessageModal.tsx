import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SendIcon, XIcon } from "lucide-react";
import type { UserPublic } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { TextArea } from "../../../components/forms/TextArea";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SelectUser } from "../../../components/select-user/SelectUser";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { serverActions } from "../../../services/serverActions";

export const NewMessageModal = ({
  controls,
  initialRecipientId,
}: {
  controls: DialogControls<void>;
  initialRecipientId?: string;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [selection, setSelection] = useState<{
    user: UserPublic | undefined;
  }>();

  const initialRecipientQuery = useActionQuery(
    ["users.getUserProfilesById", { ids: [initialRecipientId] }],
    () =>
      serverActions.users.getUserProfilesById({
        ids: initialRecipientId ? [initialRecipientId] : [],
      }),
    { enabled: !!initialRecipientId },
  );
  const recipientInfo = initialRecipientQuery.data?.at(0);

  const recipientId = selection ? selection.user?.id : recipientInfo?.id;

  const send = async () => {
    if (!recipientId) return;

    const body = message || t("pages.newMessageModal.defaultMessage");
    setMessage(body);

    const response = await serverActions.messages.createMessage({
      to: recipientId,
      body,
    });
    if (!response) return;

    controls.close();
    void navigate({
      to: "/messages/$otherUserId",
      params: { otherUserId: recipientId },
    });
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={t("pages.newMessageModal.title")}
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
      <PageContent className="flex flex-col gap-10">
        <div>
          <SelectUser
            selectedUser={recipientInfo}
            onSelectedUserChange={(user) => setSelection({ user })}
          />
          {!recipientId && (
            <p className="px-4 py-2 text-sm text-muted-foreground">
              {t("pages.newMessageModal.input.target")}
            </p>
          )}
        </div>

        <TextArea
          label={t("pages.newMessageModal.compose")}
          placeholder={t("pages.newMessageModal.input.messagePlaceholder")}
          value={message}
          onValueChange={setMessage}
          rows={2}
          autoCapitalize="on"
          autoCorrect="on"
        />
      </PageContent>
      <PageFooter className="p-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!recipientId}
          onClick={() => void send()}
        >
          <SendIcon data-icon="inline-start" />
          {t("pages.newMessageModal.send")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
