import type { MouseEvent } from "react";
import { cn } from "@/lib/utils";

export const RecipePreview = ({
  url,
  description,
  selected = false,
  landscape = false,
  onPreviewClick,
}: {
  url?: string;
  description: string;
  selected?: boolean;
  landscape?: boolean;
  onPreviewClick?: (event: MouseEvent<HTMLDivElement>) => void;
}) => (
  <div
    dir="ltr"
    className={cn(
      "relative mx-2.5 mb-5 shrink-0 cursor-pointer overflow-hidden border-2 border-transparent bg-white shadow-[1px_1px_6px_rgba(0,0,0,0.7)]",
      landscape ? "h-[200px] w-[240px]" : "h-[260px] w-[180px]",
      selected && "border-primary",
    )}
    onClick={onPreviewClick}
  >
    <iframe
      title={description}
      tabIndex={-1}
      className={cn(
        "origin-top-left scale-[0.3] overflow-hidden border-none select-none",
        landscape ? "h-[600px] w-[800px]" : "h-[800px] w-[600px]",
      )}
      scrolling="no"
      src={url || undefined}
    />
    <div className="absolute inset-0" />
    <div
      dir="auto"
      className="absolute inset-x-0 bottom-0 h-5 text-center text-xs leading-5 text-black"
    >
      {description}
    </div>
  </div>
);
