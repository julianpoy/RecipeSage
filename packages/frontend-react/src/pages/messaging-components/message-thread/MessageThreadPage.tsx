import { sanitizeHtml } from "../../../utils/sanitizeHtml";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Link, getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RefreshCwIcon, SendIcon } from "lucide-react";
import type { MessageSummary } from "@recipesage/prisma";
import { WSBroadcastEventType } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CachedImage } from "../../../components/CachedImage";
import { TextArea } from "../../../components/forms/TextArea";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { useEvent } from "../../../hooks/useEvent";
import { useWebsocketEvent } from "../../../hooks/useWebsocketEvent";
import { blockAndReportUserService } from "../../../services/blockAndReportUserService";
import { EventName } from "../../../services/events";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { formatDate } from "../../../utils/formatDate";
import { linkifyStr } from "../../../utils/linkify";
import { UserActionsMenu } from "../../social/user-actions-popover/UserActionsMenu";
import type { UserActionsPopoverAction } from "../../social/user-actions-popover/UserActionsMenuItems";

const routeApi = getRouteApi("/messages/$otherUserId");

const RESUME_EVENTS = [EventName.ApplicationMultitaskingResumed];

type MessageRecipe = NonNullable<MessageSummary["recipe"]>;

interface ThreadMessage {
  message: MessageSummary;
  body: string;
  formattedDate: string;
  dateDiff?: string;
}

const deservesDateDiff = (
  previous: { createdAt: Date | string } | undefined,
  next: { createdAt: Date | string },
) => {
  if (!previous) return false;

  const p = new Date(previous.createdAt);
  const n = new Date(next.createdAt);

  return p.toDateString() !== n.toDateString();
};

const scrollToBottom = (animate: boolean) => {
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: animate ? "smooth" : "instant",
  });
};

const RecipeCard = ({
  recipe,
  fromOtherUser,
  description,
}: {
  recipe: MessageRecipe;
  fromOtherUser: boolean;
  description: ReactNode;
}) => {
  const imageLocation = recipe.recipeImages.at(0)?.image.location;

  return (
    <div
      className={cn(
        "w-[60%] max-w-[400px] rounded-md text-start shadow-[1px_1px_7px_rgba(0,0,0,0.2)]",
        fromOtherUser
          ? "bg-primary text-primary-foreground"
          : "ms-auto bg-secondary text-foreground",
      )}
    >
      <Link
        to="/recipe/$recipeId"
        params={{ recipeId: recipe.id }}
        className="flex min-h-12 items-center gap-4 rounded-md px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5"
      >
        {imageLocation && (
          <CachedImage
            src={imageLocation}
            className="size-10 shrink-0 rounded-full object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base break-words">
            <span dir="auto">{recipe.title}</span>
          </h2>
          <p className="text-sm">{description}</p>
        </div>
      </Link>
    </div>
  );
};

const MessageThread = ({ otherUserId }: { otherUserId: string }) => {
  const { t } = useTranslation();

  const [pendingMessage, setPendingMessage] = useState("");
  const [messagePlaceholder, setMessagePlaceholder] = useState(
    t("pages.messageThread.messagePlaceholder"),
  );
  const [reloading, setReloading] = useState(false);
  const [selectedChatIdx, setSelectedChatIdx] = useState(-1);
  const hasLoadedRef = useRef(false);
  const removeResizeListenerRef = useRef<() => void>(undefined);
  const placeholderTimeoutRef =
    useRef<ReturnType<typeof setTimeout>>(undefined);

  const threadQuery = useActionQuery(
    ["messages.getThread", { userId: otherUserId }],
    () => serverActions.messages.getThread({ userId: otherUserId }),
  );
  const { isPending, refetch } = threadQuery;
  const thread = threadQuery.data;

  const blockedUsersQuery = useActionQuery(["users.getMyBlockedUsers"], () =>
    serverActions.users.getMyBlockedUsers(),
  );
  const isBlockedByMe = !!blockedUsersQuery.data?.some(
    (blockedUser) => blockedUser.id === otherUserId,
  );

  const otherUserName = thread?.messageThread.otherUser.name || "";

  useEffect(() => {
    if (!isPending) return;
    const loading = loadingService.start();
    return () => loading.dismiss();
  }, [isPending]);

  useEffect(
    () => () => {
      removeResizeListenerRef.current?.();
      clearTimeout(placeholderTimeoutRef.current);
    },
    [],
  );

  const messages = useMemo((): ThreadMessage[] => {
    const rawMessages = thread?.messages || [];
    return rawMessages.map((message, index) => {
      return {
        message,
        body: linkifyStr(message.body),
        formattedDate: formatDate(message.createdAt, {
          now: true,
          times: true,
        }),
        dateDiff: deservesDateDiff(rawMessages[index - 1], message)
          ? formatDate(message.createdAt)
          : undefined,
      };
    });
  }, [thread]);

  useEffect(() => {
    if (!thread) return;
    const animate = hasLoadedRef.current;
    hasLoadedRef.current = true;
    const timeout = setTimeout(() => scrollToBottom(animate));
    return () => clearTimeout(timeout);
  }, [thread]);

  useWebsocketEvent(WSBroadcastEventType.MessageReceived, (data) => {
    if (data.otherUser.id !== otherUserId) return;
    void refetch();
  });

  useEvent(RESUME_EVENTS, () => {
    void refetch();
  });

  const reload = () => {
    setReloading(true);

    void refetch().finally(() => {
      setTimeout(() => {
        setReloading(false);
      }, 350);
    });
  };

  const keyboardOpened = () => {
    removeResizeListenerRef.current?.();

    const onWindowResize = () => {
      removeResizeListenerRef.current?.();
      setTimeout(() => scrollToBottom(false));
    };
    window.addEventListener("resize", onWindowResize);
    removeResizeListenerRef.current = () => {
      window.removeEventListener("resize", onWindowResize);
      removeResizeListenerRef.current = undefined;
    };
  };

  const getOtherUser = () => ({
    id: otherUserId,
    name: otherUserName,
  });

  const block = async () => {
    const blocked = await blockAndReportUserService.blockUser(getOtherUser());
    if (blocked) await blockedUsersQuery.refetch();
  };

  const unblock = async () => {
    const unblocked =
      await blockAndReportUserService.unblockUser(getOtherUser());
    if (unblocked) await blockedUsersQuery.refetch();
  };

  const onUserAction = (action: UserActionsPopoverAction) => {
    if (!otherUserName) return;

    switch (action) {
      case "report":
        void blockAndReportUserService.reportUser(getOtherUser());
        return;
      case "block":
        void block();
        return;
      case "unblock":
        void unblock();
        return;
    }
  };

  const sendMessage = async (myMessage: string) => {
    if (!myMessage) return;

    clearTimeout(placeholderTimeoutRef.current);
    setPendingMessage("");
    setMessagePlaceholder(t("pages.messageThread.sending"));

    const response = await serverActions.messages.createMessage({
      to: otherUserId,
      body: myMessage,
    });
    if (!response) {
      setPendingMessage(myMessage);
      setMessagePlaceholder(t("pages.messageThread.messagePlaceholder"));
      return;
    }

    setMessagePlaceholder(t("pages.messageThread.sent"));

    placeholderTimeoutRef.current = setTimeout(() => {
      setMessagePlaceholder(t("pages.messageThread.messagePlaceholder"));
    }, 1000);

    void refetch();
  };

  const onMessageKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();

    if (event.ctrlKey || event.shiftKey || event.altKey) {
      setPendingMessage((prev) => `${prev}\n`);
    } else {
      void sendMessage(pendingMessage);
    }
  };

  const setSelectedChat = (idx: number) => {
    setSelectedChatIdx((prev) => (prev === idx ? -1 : idx));
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/messages" }} />}
        title={t("pages.messageThread.title", { name: otherUserName })}
        end={
          <>
            <Button
              variant="ghost"
              size="icon-lg"
              className="text-inherit hover:bg-white/10 hover:text-inherit"
              aria-label={t("generic.reload")}
              onClick={reload}
            >
              <RefreshCwIcon
                className={cn("size-6", reloading && "animate-spin")}
              />
            </Button>
            <UserActionsMenu
              isBlockedByMe={isBlockedByMe}
              disabled={!otherUserName}
              onAction={onUserAction}
            />
          </>
        }
      />
      <PageContent>
        <div className="mx-auto max-w-page">
          {messages.map((item, idx) => {
            const { message } = item;
            const fromOtherUser = message.fromUserId === otherUserId;
            const toOtherUser = message.toUserId === otherUserId;

            return (
              <div
                key={message.id}
                className={cn("my-1", toOtherUser && "text-end")}
              >
                {item.dateDiff && (
                  <div className="mt-5 mb-2.5 text-center capitalize">
                    {item.dateDiff}
                  </div>
                )}
                {!message.recipe && (
                  <div
                    className={cn(
                      "inline-block max-w-[60%] cursor-pointer rounded-md p-2.5 text-start break-words shadow-[1px_1px_7px_rgba(0,0,0,0.2)]",
                      fromOtherUser
                        ? "bg-primary text-primary-foreground [&_a]:text-primary-foreground"
                        : "bg-secondary text-foreground",
                    )}
                    onClick={() => setSelectedChat(idx)}
                  >
                    <span
                      dir="auto"
                      className="whitespace-pre-wrap [&_a]:underline"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeHtml(item.body),
                      }}
                    />
                  </div>
                )}
                {message.recipe && fromOtherUser && (
                  <RecipeCard
                    recipe={message.recipe}
                    fromOtherUser
                    description={t("pages.messageThread.clickToOpen")}
                  />
                )}
                {message.originalRecipe && !fromOtherUser && (
                  <RecipeCard
                    recipe={message.originalRecipe}
                    fromOtherUser={false}
                    description={t("pages.messageThread.recipeCopySent")}
                  />
                )}
                {selectedChatIdx === idx && (
                  <div className="mt-1 text-sm text-muted-foreground">
                    {item.formattedDate}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </PageContent>
      <PageFooter className="border-t-0">
        <div className="mx-auto max-w-page px-4 py-2">
          {isBlockedByMe ? (
            <div className="flex items-center gap-4">
              <p className="min-w-0 flex-1 text-sm">
                {t("pages.messageThread.blockedNotice", {
                  name: otherUserName,
                })}
              </p>
              <Button className="shrink-0" onClick={() => void unblock()}>
                {t("pages.messageThread.unblock")}
              </Button>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <TextArea
                  name="body"
                  rows={1}
                  autoGrow
                  autoComplete="on"
                  spellCheck
                  autoCorrect="on"
                  aria-label={t("pages.messageThread.messagePlaceholder")}
                  placeholder={messagePlaceholder}
                  value={pendingMessage}
                  onValueChange={setPendingMessage}
                  onKeyDown={onMessageKeyDown}
                  onFocus={keyboardOpened}
                  className="max-h-[min(400px,40vh)] overflow-auto"
                />
              </div>
              <Button
                variant="ghost"
                size="icon-lg"
                className="mt-1 shrink-0 text-primary"
                aria-label={t("pages.newMessageModal.send")}
                onClick={() => void sendMessage(pendingMessage)}
              >
                <SendIcon className="size-6 rtl:-scale-x-100" />
              </Button>
            </div>
          )}
        </div>
      </PageFooter>
    </>
  );
};

export const MessageThreadPage = () => {
  const { otherUserId } = routeApi.useParams();

  return <MessageThread key={otherUserId} otherUserId={otherUserId} />;
};
