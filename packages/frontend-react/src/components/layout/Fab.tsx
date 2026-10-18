import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Fab = ({ className, ...props }: ComponentProps<typeof Button>) => (
  <Button
    size="icon-lg"
    className={cn(
      "fixed end-4 bottom-[calc(1rem+max(env(safe-area-inset-bottom),var(--cooking-toolbar-offset,0px)))] z-30 size-14 rounded-full shadow-lg print:hidden [&_svg:not([class*='size-'])]:size-6",
      className,
    )}
    {...props}
  />
);
