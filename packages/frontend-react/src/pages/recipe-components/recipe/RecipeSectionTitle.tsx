import type { ReactNode } from "react";

export const RecipeSectionTitle = ({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex min-h-12 items-center gap-4 px-4 py-1 text-muted-foreground [&_svg]:size-8 [&_svg]:shrink-0">
    {icon}
    <p className="text-sm">{children}</p>
  </div>
);
