import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export const ImportStep = ({
  number,
  disabled = false,
  children,
}: {
  number: number;
  disabled?: boolean;
  children: ReactNode;
}) => {
  const { t } = useTranslation();

  return (
    <section
      aria-disabled={disabled || undefined}
      inert={disabled}
      className={cn(
        "flex flex-col gap-3",
        disabled && "pointer-events-none opacity-50 select-none",
      )}
    >
      <h2 className="font-medium">{t("pages.import.step", { number })}</h2>
      <div className="flex flex-col items-start gap-3 ps-4">{children}</div>
    </section>
  );
};
