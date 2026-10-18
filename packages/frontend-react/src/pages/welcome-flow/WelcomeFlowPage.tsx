import { useRef, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRightIcon, DownloadIcon, UtensilsIcon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { PageHeader } from "../../components/layout/PageHeader";
import { loadingService } from "../../services/loadingService";
import { serverActions } from "../../services/serverActions";

const WelcomeFlowChoice = ({
  icon,
  title,
  description,
  disabled,
  busy,
  delayClassName,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  disabled: boolean;
  busy?: boolean;
  delayClassName: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    disabled={disabled}
    aria-busy={busy}
    className={cn(
      "flex w-full cursor-pointer items-center gap-4 overflow-hidden rounded-2xl border bg-card px-5 py-[18px] text-start text-card-foreground outline-none focus-visible:ring-3 focus-visible:ring-primary disabled:cursor-default disabled:opacity-60 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:fill-mode-backwards motion-safe:duration-350 hover:not-disabled:border-primary hover:not-disabled:bg-primary/5",
      delayClassName,
    )}
    onClick={onClick}
  >
    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/15 text-primary [&_svg]:size-[26px]">
      {icon}
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-1">
      <span className="text-lg leading-[1.3] font-semibold wrap-anywhere">
        {title}
      </span>
      <span className="text-[0.95rem] leading-[1.45] text-muted-foreground wrap-anywhere">
        {description}
      </span>
    </span>
  </button>
);

export const WelcomeFlowPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const creatingRef = useRef(false);

  const goHome = () => {
    void navigate({
      to: "/list/$folder",
      params: { folder: "main" },
      replace: true,
    });
  };

  const startBlank = () => {
    if (creatingRef.current) return;
    goHome();
  };

  const addExampleRecipes = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    setCreating(true);
    const loading = loadingService.start();

    const response = await serverActions.recipes.createExampleRecipes();

    loading.dismiss();
    creatingRef.current = false;
    setCreating(false);

    if (!response) return;

    goHome();
  };

  const goToImport = () => {
    if (creatingRef.current) return;
    void navigate({ to: "/settings/import", replace: true });
  };

  return (
    <div className="flex min-h-svh flex-col min-[900px]:grid min-[900px]:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section className="relative flex min-h-[clamp(220px,38vh,320px)] flex-none items-end justify-center overflow-hidden text-center text-white min-[600px]:max-[899px]:min-h-[clamp(280px,42vh,480px)] min-[900px]:min-h-full min-[900px]:items-center">
        <img
          className="absolute inset-0 size-full origin-[center_40%] scale-[1.12] object-cover object-[center_40%] min-[900px]:scale-100 min-[900px]:object-center"
          src="assets/stockphotos/chicken-salad-1280.jpg"
          srcSet="assets/stockphotos/chicken-salad-640.jpg 640w, assets/stockphotos/chicken-salad-1280.jpg 1280w, assets/stockphotos/chicken-salad-1920.jpg 1920w"
          sizes="(min-width: 900px) 45vw, 100vw"
          alt=""
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_62%_at_50%_82%,rgba(0,0,0,0.58)_0%,rgba(0,0,0,0.3)_50%,rgba(0,0,0,0)_100%),linear-gradient(180deg,rgba(0,0,0,0.3)_0%,rgba(0,0,0,0)_22%,rgba(0,0,0,0.22)_48%,rgba(0,0,0,0.6)_74%,rgba(0,0,0,0.84)_100%)] min-[900px]:bg-[radial-gradient(ellipse_80%_42%_at_50%_50%,rgba(0,0,0,0.68)_0%,rgba(0,0,0,0.42)_50%,rgba(0,0,0,0)_100%),linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.1)_22%,rgba(0,0,0,0.1)_78%,rgba(0,0,0,0.4)_100%)]" />
        <PageHeader className="absolute inset-x-0 top-0 bg-transparent text-white" />
        <div className="relative max-w-[560px] px-6 pt-[calc(56px+env(safe-area-inset-top)+8px)] pb-7 min-[900px]:max-w-[520px]">
          <img
            className="mb-4 inline-block h-auto w-[clamp(120px,12vw,170px)] max-w-[50%] drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] min-[900px]:mb-6 min-[900px]:w-[200px]"
            src="assets/recipesage-white-trimmed-600.png"
            alt="RecipeSage"
          />
          <h1 className="mb-2 text-[clamp(1.6rem,5vw,2.25rem)] leading-[1.15] font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.5),0_4px_18px_rgba(0,0,0,0.45)] min-[900px]:mb-3 min-[900px]:text-[clamp(2rem,3vw,2.75rem)]">
            {t("pages.welcomeFlow.header")}
          </h1>
          <p className="text-base leading-[1.45] opacity-95 [text-shadow:0_1px_2px_rgba(0,0,0,0.5),0_3px_14px_rgba(0,0,0,0.45)] min-[900px]:text-[1.1rem]">
            {t("pages.welcomeFlow.intro")}
          </p>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[560px] flex-col gap-3 px-5 pt-6 pb-[calc(24px+env(safe-area-inset-bottom))] min-[900px]:self-center min-[900px]:p-12">
        <WelcomeFlowChoice
          icon={creating ? <Spinner /> : <UtensilsIcon aria-hidden="true" />}
          title={t("pages.welcomeFlow.examples.title")}
          description={t("pages.welcomeFlow.examples.description")}
          disabled={creating}
          busy={creating}
          delayClassName="delay-50"
          onClick={() => void addExampleRecipes()}
        />
        <WelcomeFlowChoice
          icon={<DownloadIcon aria-hidden="true" />}
          title={t("pages.welcomeFlow.import.title")}
          description={t("pages.welcomeFlow.import.description")}
          disabled={creating}
          delayClassName="delay-110"
          onClick={goToImport}
        />
        <WelcomeFlowChoice
          icon={
            <ArrowRightIcon aria-hidden="true" className="rtl:rotate-180" />
          }
          title={t("pages.welcomeFlow.blank.title")}
          description={t("pages.welcomeFlow.blank.description")}
          disabled={creating}
          delayClassName="delay-170"
          onClick={startBlank}
        />
      </section>
    </div>
  );
};
