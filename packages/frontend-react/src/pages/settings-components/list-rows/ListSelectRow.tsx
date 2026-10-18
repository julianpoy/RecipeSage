import { useId, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { listRowClasses } from "./listRowClasses";

export interface ListSelectOption<T extends string> {
  value: T;
  label: string;
  lang?: string;
}

export const ListSelectRow = <T extends string>({
  icon,
  label,
  value,
  options,
  onValueChange,
  optionClassName,
}: {
  icon?: ReactNode;
  label: ReactNode;
  value: T;
  options: ListSelectOption<T>[];
  onValueChange: (value: T) => void;
  optionClassName?: string;
}) => {
  const labelId = useId();

  return (
    <div className={listRowClasses}>
      {icon}
      <span id={labelId} className="min-w-0 flex-1 break-words">
        {label}
      </span>
      <Select<T>
        value={value}
        items={options.map((option) => ({
          value: option.value,
          label: option.label,
        }))}
        onValueChange={(newValue) => {
          if (newValue !== null) onValueChange(newValue);
        }}
      >
        <SelectTrigger
          aria-labelledby={labelId}
          className="h-10 max-w-[55%] shrink-0 bg-transparent text-base hover:bg-muted"
        >
          <SelectValue className={cn("truncate", optionClassName)} />
        </SelectTrigger>
        <SelectContent
          alignItemWithTrigger={false}
          align="end"
          className="w-max max-w-[calc(100vw-2rem)] min-w-(--anchor-width)"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              lang={option.lang}
              className={cn("min-h-10 text-base", optionClassName)}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
