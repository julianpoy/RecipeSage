import { loadingStore } from "../../services/loadingService";
import { cn } from "@/lib/utils";

export const LoadingBar = () => {
  const isLoading = loadingStore((state) => state.activeCount > 0);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden transition-opacity duration-300 print:hidden",
        isLoading ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="h-full w-1/3 animate-[loading-bar_1.2s_ease-in-out_infinite] bg-primary" />
    </div>
  );
};
