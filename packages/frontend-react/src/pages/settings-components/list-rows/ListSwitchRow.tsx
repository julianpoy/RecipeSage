import { useId, type ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { listRowClasses } from "./listRowClasses";

export const ListSwitchRow = ({
  icon,
  checked,
  onCheckedChange,
  children,
}: {
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
}) => {
  const id = useId();

  return (
    <label htmlFor={id} className={cn(listRowClasses, "cursor-pointer")}>
      {icon}
      <span className="min-w-0 flex-1 break-words">{children}</span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
};
