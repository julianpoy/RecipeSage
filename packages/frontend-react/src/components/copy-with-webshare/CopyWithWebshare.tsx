import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";
import { Clipboard } from "@capacitor/clipboard";
import { CopyIcon, ShareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const CopyWithWebshare = ({
  webshareTitle,
  webshareText,
  webshareURL,
  copyText,
  disableWebshare = false,
}: {
  webshareTitle?: string;
  webshareText?: string;
  webshareURL?: string;
  copyText: string;
  disableWebshare?: boolean;
}) => {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isNative = Capacitor.isNativePlatform();
  const hasCopyAPI =
    isNative ||
    !!navigator.clipboard ||
    typeof document.execCommand === "function";
  const hasWebShareAPI =
    (isNative || typeof navigator.share === "function") && !disableWebshare;

  const webShare = async () => {
    if (!hasWebShareAPI) return;

    try {
      if (isNative) {
        await Share.share({
          title: webshareTitle,
          text: webshareText,
          url: webshareURL,
        });
        return;
      }

      await navigator.share({
        title: webshareTitle,
        text: webshareText,
        url: webshareURL,
      });
    } catch {
      // Ignore webshare errors
    }
  };

  const clipboard = async () => {
    if (isNative) {
      await Clipboard.write({ string: copyText });
      return;
    }

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(copyText);
        return;
      }
    } catch (e) {
      console.warn("Clipboard API write failed", e);
    }

    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.select();
    document.execCommand("copy");
  };

  return (
    <div>
      <p className="px-4 pt-4 text-sm text-muted-foreground">
        {t("components.copyWithWebshare.instructions")}
        {!hasWebShareAPI && (
          <span> {t("components.copyWithWebshare.shareIcon")}</span>
        )}
      </p>
      <div className="m-2.5 flex items-center rounded-xl bg-muted p-4 text-foreground">
        <div
          dir="auto"
          className={cn(
            "min-w-0 max-w-full flex-1 wrap-anywhere select-all",
            hasWebShareAPI && "pe-5",
          )}
        >
          {copyText}
        </div>
        {hasWebShareAPI && (
          <Button
            variant="ghost"
            size="icon-lg"
            className="shrink-0 text-primary"
            aria-label={t("generic.share")}
            onClick={() => void webShare()}
          >
            <ShareIcon className="size-5" />
          </Button>
        )}
        {!hasWebShareAPI && hasCopyAPI && (
          <Button
            variant="ghost"
            size="icon-lg"
            className="shrink-0 text-primary"
            aria-label={t("generic.copy")}
            onClick={() => void clipboard()}
          >
            <CopyIcon className="size-5" />
          </Button>
        )}
      </div>
      <textarea
        ref={textareaRef}
        aria-hidden="true"
        tabIndex={-1}
        readOnly
        className="pointer-events-none fixed -top-full start-0 size-px opacity-0"
        value={copyText}
      />
    </div>
  );
};
