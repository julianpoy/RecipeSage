import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { RefreshCwIcon, SendIcon } from "lucide-react";
import type { AssistantMessageSummary } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { CachedImage } from "../../../components/CachedImage";
import { LogoIcon } from "../../../components/LogoIcon";
import { NullState } from "../../../components/NullState";
import { showToast } from "../../../components/dialogs/showToast";
import { TextArea } from "../../../components/forms/TextArea";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { thirdPartyAiConsentService } from "../../../services/thirdPartyAiConsentService";
import { formatDate } from "../../../utils/formatDate";
import { sanitizeHtml } from "../../../utils/sanitizeHtml";

const MAX_MESSAGE_LENGTH = 1500;

type ScrollBehaviorOption = "newest" | "bottom" | "none";

interface ScrollIntent {
  behavior: ScrollBehaviorOption;
  animate: boolean;
}

const CHAT_CONTENT_CLASSES =
  "[&_a]:underline [&_blockquote]:border-s-4 [&_blockquote]:border-current/30 [&_blockquote]:ps-3 [&_code]:font-mono [&_h1]:my-3 [&_h1]:text-[1.35rem] [&_h1]:font-bold [&_h2]:my-3 [&_h2]:text-[1.3rem] [&_h2]:font-bold [&_h3]:my-3 [&_h3]:text-[1.25rem] [&_h3]:font-bold [&_h4]:my-3 [&_h4]:text-[1.2rem] [&_h4]:font-bold [&_h5]:my-3 [&_h5]:text-[1.15rem] [&_h5]:font-bold [&_h6]:my-3 [&_h6]:text-[1.1rem] [&_h6]:font-bold [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-6 [&_p]:my-3 [&_p:first-child]:mt-[3px] [&_p:last-child]:mb-[3px] [&_pre]:overflow-x-auto [&_pre]:whitespace-pre-wrap [&_table]:my-3 [&_td]:border [&_td]:border-current/30 [&_td]:px-2 [&_th]:border [&_th]:border-current/30 [&_th]:px-2 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-6";

interface ProcessedMessage {
  message: AssistantMessageSummary;
  html: string;
  formattedDate: string;
  dateDiff?: string;
}

const deservesDateDiff = (
  previous: { createdAt: Date | string | number } | undefined,
  next: { createdAt: Date | string | number },
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

export const AssistantPage = () => {
  const { t } = useTranslation();

  const [pendingMessage, setPendingMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [selectedChatIdx, setSelectedChatIdx] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesByIdRef = useRef(new Map<string, AssistantMessageSummary>());
  const scrollIntentRef = useRef<ScrollIntent>({
    behavior: "bottom",
    animate: false,
  });
  const removeResizeListenerRef = useRef<() => void>(undefined);

  const messagesQuery = useActionQuery(["assistant.getAssistantMessages"], () =>
    serverActions.assistant.getAssistantMessages(),
  );
  const { isPending, refetch } = messagesQuery;
  const response = messagesQuery.data;

  useEffect(() => {
    if (!isPending) return;
    const loading = loadingService.start();
    return () => loading.dismiss();
  }, [isPending]);

  useEffect(() => () => removeResizeListenerRef.current?.(), []);

  const messages = useMemo(
    () =>
      (response || []).filter((message) => message.content || message.recipe),
    [response],
  );

  const processedMessages = useMemo(
    () =>
      messages.map(
        (message, idx): ProcessedMessage => ({
          message,
          html: message.content ? sanitizeHtml(message.content) : "",
          formattedDate: formatDate(message.createdAt, {
            now: true,
            times: true,
          }),
          dateDiff: deservesDateDiff(messages[idx - 1], message)
            ? formatDate(message.createdAt)
            : undefined,
        }),
      ),
    [messages],
  );

  useEffect(() => {
    if (!response) return;

    let firstNewMessage: AssistantMessageSummary | undefined;
    for (const message of messages) {
      if (!message.content) continue;
      if (!messagesByIdRef.current.has(message.id) && !firstNewMessage) {
        firstNewMessage = message;
      }
      messagesByIdRef.current.set(message.id, message);
    }

    const { behavior, animate } = scrollIntentRef.current;
    const timeout = setTimeout(() => {
      if (behavior === "bottom") {
        scrollToBottom(animate);
      }
      if (behavior === "newest" && firstNewMessage) {
        document
          .getElementById(`message-${firstNewMessage.id}`)
          ?.scrollIntoView({
            block: "start",
            inline: "nearest",
            behavior: animate ? "smooth" : "instant",
          });
      }
    });
    return () => clearTimeout(timeout);
  }, [response, messages]);

  const loadMessages = (behavior: ScrollBehaviorOption, animate: boolean) => {
    scrollIntentRef.current = { behavior, animate };
    return refetch();
  };

  const reload = () => {
    setReloading(true);

    void loadMessages("bottom", true).finally(() => {
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

  const sendMessage = async (message: string) => {
    if (message.length > MAX_MESSAGE_LENGTH) {
      showToast({
        message: t("pages.assistant.messageSize"),
      });
      return;
    }

    if (processing || !message) return;
    if (!(await thirdPartyAiConsentService.ensureConsent())) return;

    setProcessing(true);

    const sendResponse = await serverActions.assistant.sendAssistantMessage({
      content: message,
    });

    if (!sendResponse) {
      setTimeout(() => {
        setPendingMessage(message);
      }, 150);
    }

    setProcessing(false);
    setPendingMessage("");
    void loadMessages("newest", true);

    setTimeout(() => {
      textareaRef.current?.focus();
    });
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
        start={<BackButton fallback={{ to: "/tools" }} />}
        title={t("pages.assistant.title")}
        end={
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
        }
      />
      <PageContent>
        <div className="mx-auto max-w-page">
          <NullState icon={<LogoIcon />}>
            <h2 className="text-lg font-medium">
              {t("pages.assistant.welcome.1")}
            </h2>
            <br />
            <br />
            <p className="text-sm text-muted-foreground">
              {t("pages.assistant.welcome.2")}
              <br />
              {t("pages.assistant.welcome.3")}
              <br />
              {t("pages.assistant.welcome.4")}
              <br />
              <a
                href="https://docs.recipesage.com/docs/tutorials/assistant/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t("pages.assistant.welcome.documentation")}
              </a>
              <br />
              <br />
              <br />
            </p>
          </NullState>
          {processedMessages.map((item, idx) => {
            const { message } = item;
            const isMe = message.role === "user";
            const recipe = message.recipe;
            const recipeImageLocation =
              recipe?.recipeImages.at(0)?.image.location;

            return (
              <div
                key={message.id}
                id={`message-${message.id}`}
                className={cn("my-2.5 scroll-mt-16", isMe && "text-end")}
              >
                {item.dateDiff && (
                  <div className="mt-5 mb-2.5 text-center capitalize">
                    {item.dateDiff}
                  </div>
                )}
                {!message.recipeId && (
                  <div
                    dir="auto"
                    className={cn(
                      "inline-block w-[90%] max-w-[600px] cursor-pointer rounded-md p-2.5 text-start break-words shadow-[1px_1px_7px_rgba(0,0,0,0.3)]",
                      CHAT_CONTENT_CLASSES,
                      isMe
                        ? "bg-[rgb(0,104,166)] text-white [&_a]:text-white"
                        : "bg-secondary text-foreground [&_a]:text-foreground",
                    )}
                    onClick={() => setSelectedChat(idx)}
                    dangerouslySetInnerHTML={{ __html: item.html }}
                  />
                )}
                {recipe && (
                  <div
                    className={cn(
                      "w-[60%] max-w-[400px] rounded-md text-start shadow-[1px_1px_7px_rgba(0,0,0,0.3)]",
                      isMe
                        ? "ms-auto bg-[rgb(0,104,166)] text-white"
                        : "bg-secondary text-foreground",
                    )}
                  >
                    <Link
                      to="/recipe/$recipeId"
                      params={{ recipeId: recipe.id }}
                      className="flex min-h-12 items-center gap-4 rounded-md px-4 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      {recipeImageLocation ? (
                        <CachedImage
                          src={recipeImageLocation}
                          className="size-10 shrink-0 rounded-full object-cover"
                        />
                      ) : (
                        !isMe && (
                          <img
                            src="assets/imgs/logo_green.png"
                            alt=""
                            className="size-10 shrink-0 object-cover"
                          />
                        )
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base break-words">
                          <span dir="auto">{recipe.title}</span>
                        </h2>
                        <p className="text-sm">
                          {isMe
                            ? t("pages.messageThread.recipeCopySent")
                            : t("pages.messageThread.clickToOpen")}
                        </p>
                      </div>
                    </Link>
                  </div>
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
      <PageFooter>
        <form
          className="mx-auto flex max-w-page items-start gap-2 px-4 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            void sendMessage(pendingMessage);
          }}
        >
          <div className="min-w-0 flex-1">
            <TextArea
              ref={textareaRef}
              name="body"
              rows={1}
              autoGrow
              maxLength={MAX_MESSAGE_LENGTH}
              autoComplete="on"
              spellCheck
              autoCorrect="on"
              autoCapitalize="on"
              aria-label={t("pages.messageThread.messagePlaceholder")}
              placeholder={t("pages.messageThread.messagePlaceholder")}
              value={pendingMessage}
              onValueChange={setPendingMessage}
              onKeyDown={onMessageKeyDown}
              onFocus={keyboardOpened}
              disabled={processing}
              className="max-h-[min(400px,40vh)] overflow-auto"
            />
            <div className="pt-1 text-end text-xs text-muted-foreground">
              {pendingMessage.length} / {MAX_MESSAGE_LENGTH}
            </div>
          </div>
          <Button
            type="submit"
            variant="ghost"
            size="icon-lg"
            className="mt-1 shrink-0 text-primary"
            aria-label={t("pages.newMessageModal.send")}
          >
            {processing ? (
              <Spinner className="size-6" />
            ) : (
              <SendIcon className="size-6 rtl:-scale-x-100" />
            )}
          </Button>
        </form>
      </PageFooter>
    </>
  );
};
