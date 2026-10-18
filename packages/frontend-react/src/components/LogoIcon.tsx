import { cn } from "@/lib/utils";

export const LogoIcon = ({ noBg = false }: { noBg?: boolean }) => (
  <div className="text-center">
    <div
      className={cn(
        "inline-block size-[50px] rounded-full p-1.5",
        noBg ? "bg-transparent" : "bg-nav shadow-[1px_1px_7px_rgba(0,0,0,0.3)]",
      )}
    >
      <img src="assets/imgs/logo_green.png" alt="" />
    </div>
  </div>
);
