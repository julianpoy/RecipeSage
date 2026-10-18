import { Link, type LinkProps } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpenIcon,
  CalendarIcon,
  CloudDownloadIcon,
  CompassIcon,
  HeartIcon,
  LeafIcon,
  LifeBuoyIcon,
  LogInIcon,
  PlusIcon,
  SettingsIcon,
  ShoppingCartIcon,
  TagIcon,
  UsersIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { IS_SELFHOST } from "../../environments/environment";
import { FeatureFlagKeys, featureFlags } from "../../services/featureFlags";
import { serverActions } from "../../services/serverActions";
import { EventName } from "../../services/events";
import { useEvent } from "../../hooks/useEvent";
import { useActionQuery } from "../../hooks/useActionQuery";
import { useIsLoggedIn } from "../../hooks/useIsLoggedIn";
import { navMenuStore } from "./navMenuStore";

interface NavPage {
  id: string;
  title: string;
  icon: LucideIcon;
  link: LinkProps;
}

const RECIPE_EVENTS = [
  EventName.RecipeCreated,
  EventName.RecipeUpdated,
  EventName.RecipeDeleted,
];

const AUTH_EVENTS = [EventName.Auth];

export const AppNav = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isLoggedIn = useIsLoggedIn();
  const setMenuOpen = navMenuStore((state) => state.setOpen);

  const inboxCountQuery = useActionQuery(
    ["recipes.getRecipeCount", { folder: "inbox" }],
    () => serverActions.recipes.getRecipeCount({ folder: "inbox" }),
    { enabled: isLoggedIn },
  );
  const friendsQuery = useActionQuery(
    ["users.getMyFriends"],
    () =>
      serverActions.users.getMyFriends({
        401: () => {},
      }),
    { enabled: isLoggedIn },
  );

  useEvent(RECIPE_EVENTS, () => {
    void inboxCountQuery.refetch();
  });

  useEvent(AUTH_EVENTS, () => {
    void queryClient.invalidateQueries({
      queryKey: ["recipes.getRecipeCount"],
    });
    void queryClient.invalidateQueries({ queryKey: ["users.getMyFriends"] });
  });

  const inboxCount = isLoggedIn ? inboxCountQuery.data?.count || 0 : 0;
  const friendRequestCount = isLoggedIn
    ? friendsQuery.data?.incomingRequests?.length || 0
    : 0;
  const peopleBadgeCount = inboxCount + friendRequestCount;

  const enableInstallInstructions =
    featureFlags[FeatureFlagKeys.EnableInstallInstructions];
  const enableContribution = featureFlags[FeatureFlagKeys.EnableContribution];
  const enableDiscover = featureFlags[FeatureFlagKeys.EnableDiscover];

  const loggedOutPages: [boolean, NavPage][] = [
    [
      true,
      {
        id: "login",
        title: t("pages.app.nav.login"),
        icon: LogInIcon,
        link: { to: "/auth/$authType", params: { authType: "login" } },
      },
    ],
    [
      true,
      {
        id: "register",
        title: t("pages.app.nav.register"),
        icon: LeafIcon,
        link: { to: "/auth/$authType", params: { authType: "register" } },
      },
    ],
    [
      enableDiscover,
      {
        id: "discover",
        title: t("pages.app.nav.discover"),
        icon: CompassIcon,
        link: { to: "/discover" },
      },
    ],
    [
      enableInstallInstructions,
      {
        id: "download",
        title: t("pages.app.nav.download"),
        icon: CloudDownloadIcon,
        link: { to: "/install" },
      },
    ],
    [
      enableContribution,
      {
        id: "contribute",
        title: t("pages.app.nav.contribute"),
        icon: HeartIcon,
        link: { to: "/contribute" },
      },
    ],
    [
      true,
      {
        id: "settings",
        title: t("pages.app.nav.settings"),
        icon: SettingsIcon,
        link: { to: "/settings" },
      },
    ],
    [
      true,
      {
        id: "about",
        title: t("pages.app.nav.about"),
        icon: LifeBuoyIcon,
        link: { to: "/about" },
      },
    ],
  ];

  const loggedInPages: [boolean, NavPage][] = [
    [
      true,
      {
        id: "home",
        title: t("pages.app.nav.home"),
        icon: BookOpenIcon,
        link: { to: "/list/$folder", params: { folder: "main" } },
      },
    ],
    [
      true,
      {
        id: "newrecipe",
        title: t("pages.app.nav.newrecipe"),
        icon: PlusIcon,
        link: { to: "/edit-recipe/$recipeId", params: { recipeId: "new" } },
      },
    ],
    [
      true,
      {
        id: "shopping",
        title: t("pages.app.nav.shopping"),
        icon: ShoppingCartIcon,
        link: { to: "/shopping-lists" },
      },
    ],
    [
      true,
      {
        id: "meals",
        title: t("pages.app.nav.meals"),
        icon: CalendarIcon,
        link: { to: "/meal-planners" },
      },
    ],
    [
      true,
      {
        id: "people",
        title: t("pages.app.nav.people"),
        icon: UsersIcon,
        link: { to: "/people" },
      },
    ],
    [
      enableDiscover,
      {
        id: "discover",
        title: t("pages.app.nav.discover"),
        icon: CompassIcon,
        link: { to: "/discover" },
      },
    ],
    [
      true,
      {
        id: "tools",
        title: t("pages.app.nav.tools"),
        icon: WrenchIcon,
        link: { to: "/tools" },
      },
    ],
    [
      true,
      {
        id: "labels",
        title: t("pages.app.nav.labels"),
        icon: TagIcon,
        link: { to: "/labels" },
      },
    ],
    [
      enableInstallInstructions,
      {
        id: "download",
        title: t("pages.app.nav.download"),
        icon: CloudDownloadIcon,
        link: { to: "/install" },
      },
    ],
    [
      enableContribution,
      {
        id: "contribute",
        title: t("pages.app.nav.contribute"),
        icon: HeartIcon,
        link: { to: "/contribute" },
      },
    ],
    [
      true,
      {
        id: "settings",
        title: t("pages.app.nav.settings"),
        icon: SettingsIcon,
        link: { to: "/settings" },
      },
    ],
    [
      true,
      {
        id: "about",
        title: t("pages.app.nav.about"),
        icon: LifeBuoyIcon,
        link: { to: "/about" },
      },
    ],
  ];

  const navPages = (isLoggedIn ? loggedInPages : loggedOutPages)
    .filter(([enabled]) => enabled)
    .map(([, page]) => page);

  return (
    <>
      <SidebarHeader className="flex h-14 flex-row items-center bg-nav px-4 pt-[env(safe-area-inset-top)] text-nav-foreground box-content">
        {IS_SELFHOST ? (
          <span className="text-lg font-medium">RecipeSage Self Hosted</span>
        ) : (
          <img
            src="assets/recipesage-white-trimmed.png"
            alt="RecipeSage"
            className="inline-block h-10"
          />
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navPages.map((page) => {
              const Icon = page.icon;
              return (
                <SidebarMenuItem key={page.id}>
                  <SidebarMenuButton
                    size="lg"
                    render={
                      <Link
                        {...page.link}
                        replace
                        onClick={() => setMenuOpen(false)}
                      />
                    }
                  >
                    <Icon />
                    <span className="whitespace-normal">{page.title}</span>
                  </SidebarMenuButton>
                  {page.id === "people" && peopleBadgeCount > 0 && (
                    <SidebarMenuBadge>{peopleBadgeCount}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-sm">
        <p>
          {window.version}
          <br />
          <Link
            to="/about/details"
            className="text-primary underline-offset-4 hover:underline"
            onClick={() => setMenuOpen(false)}
          >
            Julian Poyourow
          </Link>
        </p>
      </SidebarFooter>
    </>
  );
};
