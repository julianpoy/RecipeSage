import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const InfoBlock = ({
  icon,
  ariaLabel,
  color,
  title,
  source,
  children,
  className,
}: {
  icon?: ReactNode;
  ariaLabel?: string;
  color?: "danger";
  title?: ReactNode;
  source?: ReactNode;
  children?: ReactNode;
  className?: string;
}) => {
  const isDanger = color === "danger";

  return (
    <aside
      role="note"
      aria-label={ariaLabel}
      className={cn(
        "flex gap-3 rounded-lg border px-4 py-3",
        isDanger
          ? "border-destructive bg-destructive/8"
          : "border-border bg-muted/50",
        className,
      )}
    >
      {icon && (
        <div
          aria-hidden="true"
          className={cn(
            "flex shrink-0 items-start [&_svg]:size-5",
            isDanger ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1 [&_a]:text-primary [&_a]:no-underline [&_a:hover]:underline [&>p]:mb-1.5 [&>p]:text-[0.8rem] [&>p]:leading-snug [&>p:last-child]:mb-0">
        <p
          className={cn(
            "mb-1.5 text-[0.9rem] leading-snug font-bold",
            isDanger ? "text-destructive" : "text-foreground",
          )}
        >
          {title}
        </p>
        {children}
        {source && (
          <div className="mt-1 text-[0.72rem] leading-snug text-muted-foreground">
            {source}
          </div>
        )}
      </div>
    </aside>
  );
};
