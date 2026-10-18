import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { MessageSquareIcon, PlusIcon } from "lucide-react";
import { WSBroadcastEventType } from "@recipesage/util/shared";
import { Spinner } from "@/components/ui/spinner";
import { NullState } from "../../../components/NullState";
import { Fab } from "../../../components/layout/Fab";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { useWebsocketEvent } from "../../../hooks/useWebsocketEvent";
import { loadingService } from "../../../services/loadingService";
import { messagingService } from "../../../services/messagingService";
import { serverActions } from "../../../services/serverActions";
import { formatDate } from "../../../utils/formatDate";
import { openNewMessageModal } from "../new-message-modal/openNewMessageModal";

export const MessagesPage = () => {
  const { t } = useTranslation();

  const threadsQuery = useActionQuery(["messages.getThreads"], () =>
    serverActions.messages.getThreads(),
  );
  const { isPending, refetch } = threadsQuery;
  const threads = threadsQuery.data || [];

  const [, setNotificationsStateVersion] = useState(0);

  useEffect(() => {
    void messagingService.requestNotifications().finally(() => {
      setNotificationsStateVersion((prev) => prev + 1);
    });
  }, []);

  useEffect(() => {
    if (!isPending) return;
    const loading = loadingService.start();
    return () => loading.dismiss();
  }, [isPending]);

  useWebsocketEvent(WSBroadcastEventType.MessageReceived, () => {
    void refetch();
  });

  const showNotificationsWarning =
    messagingService.isNotificationsCapable() &&
    !messagingService.isNotificationsEnabled();

  return (
    <>
      <PageHeader title={t("pages.messages.title")} />
      <PageContent padded={false} className="pb-24">
        <div className="mx-auto max-w-page">
          {showNotificationsWarning && (
            <div className="p-4 text-center">
              <b className="text-destructive">{t("pages.messages.warning")}</b>{" "}
              {t("pages.messages.notificationsRequired")}
              <br />
              <a
                href="https://support.google.com/chrome/answer/114662?visit_id=1-636632909352922358-846594632&rd=1"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t("pages.messages.notificationsInstructions")}
              </a>
            </div>
          )}

          {!isPending && threads.length > 0 && (
            <ul>
              {threads.map((thread) => {
                const latestMessage = thread.latestMessage;
                const sentByMe =
                  latestMessage &&
                  latestMessage.fromUserId !== thread.otherUser.id;

                let preview: string | undefined;
                if (latestMessage) {
                  if (sentByMe) {
                    preview = latestMessage.recipe
                      ? t("pages.messages.history.youSentRecipe")
                      : t("pages.messages.history.youSaid", {
                          message: latestMessage.body,
                        });
                  } else {
                    preview = latestMessage.recipe
                      ? t("pages.messages.history.sentRecipe")
                      : latestMessage.body;
                  }
                }

                return (
                  <li key={thread.otherUser.id} className="border-b">
                    <Link
                      to="/messages/$otherUserId"
                      params={{ otherUserId: thread.otherUser.id }}
                      className="flex min-h-14 items-center gap-4 px-4 py-2.5 hover:bg-muted"
                    >
                      <MessageSquareIcon
                        aria-hidden="true"
                        className="size-6 shrink-0 text-muted-foreground"
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base">
                          <span dir="auto">{thread.otherUser.name}</span>
                        </h2>
                        {latestMessage && (
                          <>
                            <p className="truncate text-sm text-muted-foreground">
                              <span dir="auto">{preview}</span>
                            </p>
                            <p className="truncate text-sm text-muted-foreground">
                              {formatDate(latestMessage.updatedAt, {
                                now: true,
                              })}
                            </p>
                          </>
                        )}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}

          {!isPending && threads.length === 0 && (
            <NullState
              icon={
                <MessageSquareIcon
                  aria-hidden="true"
                  className="text-muted-foreground"
                />
              }
            >
              <p className="px-4 text-sm text-muted-foreground">
                {t("pages.messages.noMessages")}
                <br />
                {t("pages.messages.instructions")}
              </p>
            </NullState>
          )}

          {isPending && (
            <NullState icon={<Spinner />}>
              <p className="text-sm text-muted-foreground">
                {t("pages.messages.loading")}
              </p>
            </NullState>
          )}
        </div>
      </PageContent>
      <Fab
        aria-label={t("pages.newMessageModal.title")}
        onClick={() => void openNewMessageModal()}
      >
        <PlusIcon />
      </Fab>
    </>
  );
};
