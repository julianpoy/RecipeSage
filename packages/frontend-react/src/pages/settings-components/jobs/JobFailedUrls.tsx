import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export const JobFailedUrls = ({ urls }: { urls: string[] }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!urls.length) return null;

  return (
    <div className="flex flex-col items-start text-sm text-muted-foreground">
      <Button
        variant="ghost"
        size="sm"
        className="-ms-3 text-primary"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        {expanded
          ? t("pages.jobs.import.failedUrls.hide")
          : t("pages.jobs.import.failedUrls.show")}
      </Button>
      {expanded &&
        urls.map((url, idx) => (
          <a
            key={idx}
            href={url}
            target="_blank"
            rel="noopener"
            dir="auto"
            className="break-all text-primary hover:underline"
          >
            {url}
          </a>
        ))}
    </div>
  );
};
