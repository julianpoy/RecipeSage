import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageHeader } from "../../components/layout/PageHeader";

const ACTION_CLASSES =
  "mx-auto flex h-12 w-full max-w-[400px] rounded-md text-base font-semibold text-white";

export const GetStartedPage = () => {
  const { t } = useTranslation();

  return (
    <div className="relative flex min-h-svh flex-col overflow-hidden">
      <img
        className="absolute inset-0 z-0 size-full object-cover"
        src="assets/stockphotos/chicken-salad-1280.jpg"
        srcSet="assets/stockphotos/chicken-salad-640.jpg 640w, assets/stockphotos/chicken-salad-1280.jpg 1280w, assets/stockphotos/chicken-salad-1920.jpg 1920w"
        sizes="100vw"
        alt=""
      />
      <div className="absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.45)_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0)_72%),linear-gradient(rgba(0,0,0,0.78),rgba(0,0,0,0.78))]" />

      <PageHeader className="z-20 bg-transparent text-white" />

      <main className="relative z-10 flex flex-1 flex-col items-center">
        <div className="flex w-full max-w-[560px] flex-1 flex-col items-center px-6 pt-[10vh] pb-6 text-center text-white">
          <img
            className="mb-7 h-auto w-[190px] max-w-[60%]"
            src="assets/recipesage-white-trimmed-600.png"
            alt="RecipeSage"
          />

          <h1 className="mb-4 text-[clamp(1.75rem,6vw,2.75rem)] leading-[1.15] font-semibold">
            {t("pages.getStarted.title")}
          </h1>
          <p className="text-[1.05rem] leading-[1.55] opacity-95">
            {t("pages.getStarted.reason")}
          </p>
          <p className="mt-4 text-[0.9rem] leading-normal opacity-80">
            {t("pages.getStarted.crossPlatform")}
          </p>
        </div>

        <div className="sticky bottom-0 flex w-full flex-col gap-3 bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.8)_55%)] px-6 pt-8 pb-[calc(20px+env(safe-area-inset-bottom))]">
          <Link
            to="/auth/$authType"
            params={{ authType: "register" }}
            state={{ showBack: true }}
            className={cn(
              buttonVariants({ size: "lg" }),
              ACTION_CLASSES,
              "bg-[#5e8b56] shadow-[0_4px_14px_rgba(0,0,0,0.35)] hover:bg-[#5e8b56]/85",
            )}
          >
            {t("pages.getStarted.button.register")}
          </Link>
          <Link
            to="/auth/$authType"
            params={{ authType: "login" }}
            state={{ showBack: true }}
            className={cn(
              buttonVariants({ size: "lg", variant: "outline" }),
              ACTION_CLASSES,
              "border-white/70 bg-transparent hover:bg-white/10 hover:text-white dark:bg-transparent",
            )}
          >
            {t("pages.getStarted.button.login")}
          </Link>
        </div>
      </main>
    </div>
  );
};
