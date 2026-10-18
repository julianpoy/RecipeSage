import type { ReactNode } from "react";

export const NullState = ({
  icon,
  children,
}: {
  icon?: ReactNode;
  children?: ReactNode;
}) => (
  <div className="flex flex-col items-center gap-4 pt-10 text-center [&_svg]:size-10">
    {icon}
    <div className="max-w-content">{children}</div>
  </div>
);
