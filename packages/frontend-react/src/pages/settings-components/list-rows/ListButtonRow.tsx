import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { interactiveListRowClasses, listRowClasses } from "./listRowClasses";

export const ListButtonRow = ({
  icon,
  end,
  disabled,
  onClick,
  className,
  children,
}: {
  icon?: ReactNode;
  end?: ReactNode;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(listRowClasses, interactiveListRowClasses, className)}
  >
    {icon}
    <span className="min-w-0 flex-1 break-words">{children}</span>
    {end}
  </button>
);
