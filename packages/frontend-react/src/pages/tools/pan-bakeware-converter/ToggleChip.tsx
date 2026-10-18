import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ToggleChip = ({
  pressed,
  onClick,
  icon,
  className,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={pressed}
    onClick={onClick}
    className={cn(
      "inline-flex cursor-pointer items-center gap-1 rounded-full border px-2.5 text-[0.8rem] text-foreground transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&_svg]:size-4",
      pressed
        ? "border-primary/50 bg-primary/20"
        : "border-muted-foreground/50 hover:bg-muted",
      className,
    )}
  >
    {icon}
    <span>{children}</span>
  </button>
);
