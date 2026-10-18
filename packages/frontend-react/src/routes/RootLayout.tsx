import { useEffect, useLayoutEffect } from "react";
import {
  Outlet,
  useBlocker,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { SplashScreen } from "@capacitor/splash-screen";
import {
  GlobalPreferenceKey,
  WSBroadcastEventType,
} from "@recipesage/util/shared";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { CookingToolbar } from "../components/cooking-toolbar/CookingToolbar";
import { DialogHost } from "../components/dialogs/DialogHost";
import { showToast } from "../components/dialogs/showToast";
import { AppNav } from "../components/layout/AppNav";
import { LoadingBar } from "../components/layout/LoadingBar";
import { navMenuStore } from "../components/layout/navMenuStore";
import { useIsLoggedIn } from "../hooks/useIsLoggedIn";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { useWebsocketEvent } from "../hooks/useWebsocketEvent";
import { isRtlLanguage } from "../i18n/applyHtmlLanguage";
import { EventName, events } from "../services/events";
import { unsavedChanges } from "../services/unsavedChanges";
import { cookingToolbarStore } from "../stores/cookingToolbarStore";
import { preferencesStore } from "../stores/preferencesStore";
import { analytics } from "../utils/analytics";
import { dismissTopOverlay } from "../utils/dismissTopOverlay";
import { getElectronAPI } from "../utils/electron";
import { getRoutePattern } from "../utils/getRoutePattern";
import { showLocalNotification } from "../utils/showLocalNotification";

export const RootLayout = () => {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const isLoggedIn = useIsLoggedIn();
  const isWideScreen = useMediaQuery("(min-width: 1200px)");
  const enableSplitPane = preferencesStore(
    (state) => state.preferences[GlobalPreferenceKey.EnableSplitPane],
  );
  const menuOpen = navMenuStore((state) => state.open);
  const setMenuOpen = navMenuStore((state) => state.setOpen);
  const cookingToolbarOpen = cookingToolbarStore(
    (state) => state.pinnedRecipes.length > 0,
  );

  const leafMatch = useRouterState({
    select: (state) => {
      const match = state.matches.at(-1);
      return {
        titleKey: match?.staticData.titleKey,
        cookMode: !!match?.staticData.cookMode,
      };
    },
    structuralSharing: true,
  });

  const splitPaneActive =
    isWideScreen && enableSplitPane && isLoggedIn && !leafMatch.cookMode;

  useEffect(() => {
    navMenuStore.setState({ splitPaneActive });
    if (splitPaneActive) setMenuOpen(false);
  }, [splitPaneActive, setMenuOpen]);

  const titleKey = leafMatch.titleKey;
  useLayoutEffect(() => {
    if (!titleKey) return;
    document.title = t(titleKey);
  }, [titleKey, t, i18n.language]);

  useBlocker({
    shouldBlockFn: () => {
      if (!unsavedChanges.hasPendingChanges()) return false;
      return !window.confirm(t("services.unsavedChanges.message"));
    },
    enableBeforeUnload: () => unsavedChanges.hasPendingChanges(),
  });

  useEffect(() => {
    window.appLoaded = true;

    window.swRegistration?.update()?.catch((e: unknown) => {
      console.error("Failed to check for service worker update", e);
    });

    const unsubscribeResolved = router.subscribe("onResolved", (event) => {
      unsavedChanges.clearPendingChanges();

      const leaf = router.state.matches.at(-1);
      if (!leaf) return;
      analytics.trackPageView(
        event.toLocation.pathname,
        getRoutePattern(leaf.fullPath, leaf.params),
      );
    });

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      events.publish(EventName.ApplicationMultitaskingResumed);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const removeNotificationClickListener =
      getElectronAPI()?.onNotificationClick((route) => {
        void router.navigate({ href: route });
      });

    return () => {
      unsubscribeResolved();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      removeNotificationClickListener?.();
    };
  }, [router]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    void SplashScreen.hide();

    let lastBackPressAt = 0;
    const listenerP = App.addListener("backButton", () => {
      if (dismissTopOverlay()) return;

      if (navMenuStore.getState().open) {
        navMenuStore.getState().setOpen(false);
        return;
      }

      if (router.history.canGoBack()) {
        router.history.back();
        return;
      }

      const now = Date.now();
      if (now - lastBackPressAt < 2000) {
        void App.exitApp();
        return;
      }

      lastBackPressAt = now;
      showToast({
        message: t("pages.app.pressBackToExit"),
        duration: 2000,
      });
    });

    return () => {
      void listenerP.then((listener) => listener.remove());
    };
  }, [router, t]);

  useWebsocketEvent(WSBroadcastEventType.MessageReceived, (payload) => {
    const currentPath = router.state.location.pathname;
    if (currentPath === "/messages") return;
    if (currentPath === `/messages/${payload.otherUser.id}`) return;

    showToast({
      message: t("pages.app.newMessageToast.message", {
        name: payload.otherUser.name,
      }),
      duration: 7000,
      action: {
        text: t("pages.app.newMessageToast.view"),
        handler: () => {
          void router.navigate({
            to: "/messages/$otherUserId",
            params: { otherUserId: payload.otherUser.id },
          });
        },
      },
    });

    if (!document.hasFocus()) {
      void showLocalNotification({
        title: payload.otherUser.name || "",
        body: payload.recipe ? payload.recipe.title : payload.body,
        route: `/messages/${payload.otherUser.id}`,
        tag: `messages:new-${payload.otherUser.id}`,
        skipWhenHidden: true,
      });
    }
  });

  const menuSide = isRtlLanguage(i18n.language) ? "right" : "left";

  return (
    <Toaster>
      <LoadingBar />
      <SidebarProvider open={splitPaneActive} className="min-h-svh">
        {splitPaneActive ? (
          <Sidebar
            collapsible="none"
            className={cn(
              "sticky top-0 h-svh shrink-0 border-e print:hidden",
              cookingToolbarOpen &&
                "h-[calc(100svh-60px-env(safe-area-inset-bottom))]",
            )}
          >
            <AppNav />
          </Sidebar>
        ) : (
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetContent
              side={menuSide}
              showCloseButton={false}
              className="w-72 gap-0 p-0 sm:max-w-72"
            >
              <SheetTitle className="sr-only">{t("generic.menu")}</SheetTitle>
              <Sidebar collapsible="none" className="h-full w-full">
                <AppNav />
              </Sidebar>
            </SheetContent>
          </Sheet>
        )}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col",
            cookingToolbarOpen &&
              "pb-(--cooking-toolbar-offset) [--cooking-toolbar-offset:calc(60px+env(safe-area-inset-bottom))] print:pb-0",
          )}
        >
          <Outlet />
        </div>
      </SidebarProvider>
      {cookingToolbarOpen && <CookingToolbar />}
      <DialogHost />
    </Toaster>
  );
};
