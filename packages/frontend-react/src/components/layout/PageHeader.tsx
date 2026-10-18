import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MenuButton } from "./MenuButton";

export const PageHeader = ({
  title,
  start,
  end,
  children,
  className,
}: {
  title?: ReactNode;
  start?: ReactNode;
  end?: ReactNode;
  children?: ReactNode;
  className?: string;
}) => (
  <header
    className={cn(
      "sticky top-0 z-30 bg-nav text-nav-foreground pt-[env(safe-area-inset-top)] print:hidden",
      className,
    )}
  >
    <div className="flex min-h-[56px] items-center gap-1 px-1 [&_[data-slot=button][aria-expanded=true]]:bg-white/10 [&_[data-slot=button][aria-expanded=true]]:text-inherit">
      <div className="flex shrink-0 items-center">
        {start === undefined ? <MenuButton /> : start}
      </div>
      <h1 className="min-w-0 flex-1 truncate px-2 text-lg font-medium">
        {title}
      </h1>
      {end && <div className="flex shrink-0 items-center gap-1">{end}</div>}
    </div>
    {children}
  </header>
);
