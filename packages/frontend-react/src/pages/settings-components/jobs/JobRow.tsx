import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const JobRow = ({
  icon,
  title,
  progress,
  detailIcon,
  onClick,
  link,
  extra,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  progress?: number;
  detailIcon?: ReactNode;
  onClick?: () => void;
  link?: LinkProps;
  extra?: ReactNode;
  children?: ReactNode;
}) => {
  const rowClasses =
    "flex w-full items-start gap-4 px-4 py-3 text-start text-base [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0 [&>svg]:text-muted-foreground";
  const interactiveClasses =
    "cursor-pointer outline-none hover:bg-muted focus-visible:bg-muted";

  const content = (
    <>
      {icon}
      <span className="block min-w-0 flex-1">
        <span className="block break-words">{title}</span>
        <span className="block text-sm text-muted-foreground">{children}</span>
        {progress !== undefined && (
          <Progress
            value={progress}
            className="mt-2"
            aria-label={typeof title === "string" ? title : undefined}
          />
        )}
      </span>
      {detailIcon}
    </>
  );

  let main = <div className={rowClasses}>{content}</div>;
  if (link) {
    main = (
      <Link {...link} className={cn(rowClasses, interactiveClasses)}>
        {content}
      </Link>
    );
  } else if (onClick) {
    main = (
      <button
        type="button"
        onClick={onClick}
        className={cn(rowClasses, interactiveClasses)}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="border-b">
      {main}
      {extra && <div className="ps-13 pe-4 pb-3">{extra}</div>}
    </div>
  );
};
