import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { interactiveListRowClasses, listRowClasses } from "./listRowClasses";

export const ListLinkRow = ({
  icon,
  detail = false,
  children,
  ...linkProps
}: LinkProps & {
  icon?: ReactNode;
  detail?: boolean;
  children: ReactNode;
}) => (
  <Link
    {...linkProps}
    className={cn(listRowClasses, interactiveListRowClasses)}
  >
    {icon}
    <span className="min-w-0 flex-1 break-words">{children}</span>
    {detail && (
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4! text-muted-foreground rtl:rotate-180"
      />
    )}
  </Link>
);
