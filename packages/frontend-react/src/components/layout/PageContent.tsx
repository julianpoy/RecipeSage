import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const PageContent = ({
  children,
  padded = true,
  className,
}: {
  children?: ReactNode;
  padded?: boolean;
  className?: string;
}) => (
  <main
    className={cn(
      "flex-1 pb-[env(safe-area-inset-bottom)]",
      padded && "p-4",
      className,
    )}
  >
    {children}
  </main>
);
