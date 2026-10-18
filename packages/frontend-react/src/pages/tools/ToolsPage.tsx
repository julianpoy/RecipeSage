import type { ReactElement, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRightIcon,
  BookOpenIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  HeartPulseIcon,
  Maximize2Icon,
  MessageSquareMoreIcon,
  ShoppingBasketIcon,
  ThermometerIcon,
} from "lucide-react";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { PageContent } from "../../components/layout/PageContent";
import { PageHeader } from "../../components/layout/PageHeader";

const ToolItem = ({
  render,
  icon,
  title,
  subtitle,
}: {
  render: ReactElement;
  icon: ReactNode;
  title: string;
  subtitle: string;
}) => (
  <Item
    render={render}
    className="cursor-pointer rounded-none border-b-border text-start hover:bg-muted"
  >
    <ItemMedia className="self-center! translate-y-0! text-muted-foreground [&_svg]:size-6">
      {icon}
    </ItemMedia>
    <ItemContent>
      <ItemTitle className="line-clamp-none text-base font-normal">
        {title}
      </ItemTitle>
      <ItemDescription className="line-clamp-none">{subtitle}</ItemDescription>
    </ItemContent>
    <ChevronRightIcon
      aria-hidden="true"
      className="size-5 text-muted-foreground rtl:rotate-180"
    />
  </Item>
);

export const ToolsPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("pages.tools.title")} />
      <PageContent padded={false}>
        <ItemGroup className="mx-auto max-w-page gap-0">
          <ToolItem
            render={<Link to="/tools/cookbook" />}
            icon={<BookOpenIcon />}
            title={t("pages.cookbook.title")}
            subtitle={t("pages.tools.cookbook.subtitle")}
          />
          <ToolItem
            render={<Link to="/tools/nutrition" />}
            icon={<HeartPulseIcon />}
            title={t("pages.nutritionCalculator.title")}
            subtitle={t("pages.tools.nutritionCalculator.subtitle")}
          />
          <ToolItem
            render={<Link to="/tools/search-by-ingredients" />}
            icon={<ShoppingBasketIcon />}
            title={t("pages.searchByIngredients.title")}
            subtitle={t("pages.tools.searchByIngredients.subtitle")}
          />
          <ToolItem
            render={<Link to="/tools/conversions" />}
            icon={<ArrowLeftRightIcon />}
            title={t("pages.measurementConverter.title")}
            subtitle={t("pages.tools.measurementConverter.subtitle")}
          />
          <ToolItem
            render={<Link to="/tools/cooking-temperatures" />}
            icon={<ThermometerIcon />}
            title={t("pages.cookingTemperatures.title")}
            subtitle={t("pages.tools.cookingTemperatures.subtitle")}
          />
          <ToolItem
            render={<Link to="/tools/pan-bakeware-converter" />}
            icon={<Maximize2Icon />}
            title={t("pages.panBakewareConverter.title")}
            subtitle={t("pages.tools.panBakewareConverter.subtitle")}
          />
          <ToolItem
            render={<Link to="/assistant" />}
            icon={<MessageSquareMoreIcon />}
            title={t("pages.assistant.title")}
            subtitle={t("pages.tools.assistant.subtitle")}
          />
          <ToolItem
            render={
              <button
                type="button"
                onClick={() => window.open("https://docs.recipesage.com")}
              />
            }
            icon={<CircleHelpIcon />}
            title={t("pages.about.links.userGuide")}
            subtitle={t("pages.tools.userGuide.subtitle")}
          />
        </ItemGroup>
      </PageContent>
    </>
  );
};
