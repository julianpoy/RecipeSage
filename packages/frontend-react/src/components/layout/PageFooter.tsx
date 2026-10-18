import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const PageFooter = ({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}) => (
  <footer
    className={cn(
      "sticky bottom-[var(--cooking-toolbar-offset,0px)] z-30 border-t bg-background pb-[env(safe-area-inset-bottom)] print:hidden",
      className,
    )}
  >
    {children}
  </footer>
);
