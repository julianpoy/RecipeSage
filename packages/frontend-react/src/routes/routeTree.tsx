import {
  createRootRoute,
  createRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import { GlobalPreferenceKey, StartPageOptions } from "@recipesage/util/shared";
import { IS_DESKTOP } from "../environments/environment";
import { getIsElectron } from "../utils/electron";
import { session } from "../utils/session";
import { preferencesStore } from "../stores/preferencesStore";
import { RootLayout } from "./RootLayout";
import { searchParams } from "./searchParams";

const notFoundPage = lazyRouteComponent(
  () => import("../pages/error-pages/NotFoundPage"),
  "NotFoundPage",
);

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: notFoundPage,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    if (!session.isLoggedIn()) {
      if (Capacitor.isNativePlatform() || IS_DESKTOP || getIsElectron()) {
        throw redirect({ to: "/get-started", replace: true });
      }
      throw redirect({
        to: "/auth/$authType",
        params: { authType: "register" },
        replace: true,
      });
    }

    const startPage =
      preferencesStore.getState().preferences[GlobalPreferenceKey.StartPage];
    switch (startPage) {
      case StartPageOptions.ManageLabels:
        throw redirect({ to: "/labels", replace: true });
      case StartPageOptions.MealPlans:
        throw redirect({ to: "/meal-planners", replace: true });
      case StartPageOptions.ShoppingLists:
        throw redirect({ to: "/shopping-lists", replace: true });
      case StartPageOptions.MyRecipes:
      default:
        throw redirect({
          to: "/list/$folder",
          params: { folder: "main" },
          replace: true,
        });
    }
  },
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "list/$folder",
  component: lazyRouteComponent(
    () => import("../pages/home/HomePage"),
    "HomePage",
  ),
  staticData: { titleKey: "pages.home.tabTitle" },
  validateSearch: (
    search: Record<string, unknown>,
  ): { labels?: string; userId?: string } => ({
    labels: searchParams.optionalString(search.labels),
    userId: searchParams.optionalString(search.userId),
  }),
});

const labelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "labels",
  component: lazyRouteComponent(
    () => import("../pages/labels-pages/labels/LabelsPage"),
    "LabelsPage",
  ),
  staticData: { titleKey: "pages.labels.tabTitle" },
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "about",
  component: lazyRouteComponent(
    () => import("../pages/info-components/about/AboutPage"),
    "AboutPage",
  ),
  staticData: { titleKey: "pages.about.tabTitle" },
});

const downloadAndInstallRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "install",
  component: lazyRouteComponent(
    () =>
      import("../pages/info-components/download-and-install/DownloadAndInstallPage"),
    "DownloadAndInstallPage",
  ),
  staticData: { titleKey: "pages.downloadAndInstall.tabTitle" },
});

const aboutDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "about/details",
  component: lazyRouteComponent(
    () => import("../pages/info-components/about-details/AboutDetailsPage"),
    "AboutDetailsPage",
  ),
  staticData: { titleKey: "pages.aboutDetails.tabTitle" },
});

const contactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "about/contact",
  component: lazyRouteComponent(
    () => import("../pages/info-components/contact/ContactPage"),
    "ContactPage",
  ),
  staticData: { titleKey: "pages.contact.tabTitle" },
});

const legalRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "legal",
  component: lazyRouteComponent(
    () => import("../pages/info-components/legal/LegalPage"),
    "LegalPage",
  ),
  staticData: { titleKey: "pages.legal.tabTitle" },
  validateSearch: (search: Record<string, unknown>): { scrollTo?: string } => ({
    scrollTo: searchParams.optionalString(search.scrollTo),
  }),
});

const contributeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "contribute",
  component: lazyRouteComponent(
    () => import("../pages/info-components/contribute/ContributePage"),
    "ContributePage",
  ),
  staticData: { titleKey: "pages.contribute.tabTitle" },
});

const contributeCancelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "contribute/cancel",
  component: lazyRouteComponent(
    () =>
      import("../pages/info-components/contribute-cancel/ContributeCancelPage"),
    "ContributeCancelPage",
  ),
  staticData: { titleKey: "pages.contributeCancel.tabTitle" },
});

const contributeThankYouRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "contribute/thankyou",
  component: lazyRouteComponent(
    () =>
      import("../pages/info-components/contribute-thankyou/ContributeThankYouPage"),
    "ContributeThankYouPage",
  ),
  staticData: { titleKey: "pages.contributeThankYou.tabTitle" },
});

const extensionAuthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/extension",
  component: lazyRouteComponent(
    () => import("../pages/auth/extension-auth/ExtensionAuthPage"),
    "ExtensionAuthPage",
  ),
  staticData: { titleKey: "pages.extensionAuth.title" },
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect_uri?: string; state?: string } => ({
    redirect_uri: searchParams.optionalString(search.redirect_uri),
    state: searchParams.optionalString(search.state),
  }),
});

const getStartedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "get-started",
  component: lazyRouteComponent(
    () => import("../pages/get-started/GetStartedPage"),
    "GetStartedPage",
  ),
  staticData: { titleKey: "pages.getStarted.tabTitle" },
});

const welcomeFlowRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "welcome-flow",
  component: lazyRouteComponent(
    () => import("../pages/welcome-flow/WelcomeFlowPage"),
    "WelcomeFlowPage",
  ),
  staticData: { titleKey: "pages.welcomeFlow.tabTitle" },
});

const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/$authType",
  component: lazyRouteComponent(
    () => import("../pages/auth/AuthPage"),
    "AuthPage",
  ),
  staticData: { titleKey: "pages.auth.tabTitle" },
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => ({
    redirect: searchParams.optionalString(search.redirect),
  }),
});

const mealPlansRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "meal-planners",
  component: lazyRouteComponent(
    () => import("../pages/meal-plan-components/meal-plans/MealPlansPage"),
    "MealPlansPage",
  ),
  staticData: { titleKey: "pages.mealPlans.tabTitle" },
});

const mealPlanRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "meal-planners/$mealPlanId",
  component: lazyRouteComponent(
    () => import("../pages/meal-plan-components/meal-plan/MealPlanPage"),
    "MealPlanPage",
  ),
  staticData: { titleKey: "pages.mealPlan.tabTitle" },
});

const assistantRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "assistant",
  component: lazyRouteComponent(
    () => import("../pages/messaging-components/assistant/AssistantPage"),
    "AssistantPage",
  ),
  staticData: { titleKey: "pages.assistant.tabTitle" },
});

const messagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "messages",
  component: lazyRouteComponent(
    () => import("../pages/messaging-components/messages/MessagesPage"),
    "MessagesPage",
  ),
  staticData: { titleKey: "pages.messages.tabTitle" },
});

const messageThreadRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "messages/$otherUserId",
  component: lazyRouteComponent(
    () =>
      import("../pages/messaging-components/message-thread/MessageThreadPage"),
    "MessageThreadPage",
  ),
  staticData: { titleKey: "pages.messageThread.tabTitle" },
});

const editRecipeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "edit-recipe/$recipeId",
  component: lazyRouteComponent(
    () => import("../pages/recipe-components/edit-recipe/EditRecipePage"),
    "EditRecipePage",
  ),
  staticData: { titleKey: "pages.editRecipe.tabTitle" },
});

const recipeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recipe/$recipeId",
  component: lazyRouteComponent(
    () => import("../pages/recipe-components/recipe/RecipePage"),
    "RecipePage",
  ),
  staticData: { titleKey: "pages.recipeDetails.tabTitle" },
});

const recipeCookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recipe/$recipeId/cook",
  component: lazyRouteComponent(
    () => import("../pages/recipe-components/cook/RecipeCookPage"),
    "RecipeCookPage",
  ),
  staticData: { titleKey: "pages.cook.tabTitle", cookMode: true },
});

const publishDiscoverRecipeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "recipe/$recipeId/publish",
  component: lazyRouteComponent(
    () =>
      import("../pages/discover-components/publish-discover-recipe/PublishDiscoverRecipePage"),
    "PublishDiscoverRecipePage",
  ),
  staticData: { titleKey: "pages.publishDiscoverRecipe.tabTitle" },
});

const discoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "discover",
  component: lazyRouteComponent(
    () => import("../pages/discover-components/discover/DiscoverPage"),
    "DiscoverPage",
  ),
  staticData: { titleKey: "pages.discover.tabTitle" },
  validateSearch: (
    search: Record<string, unknown>,
  ): { categories?: string } => ({
    categories: searchParams.optionalString(search.categories),
  }),
});

const discoverRecipeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "discover/$discoverRecipeId",
  component: lazyRouteComponent(
    () =>
      import("../pages/discover-components/discover-recipe/DiscoverRecipePage"),
    "DiscoverRecipePage",
  ),
  staticData: { titleKey: "pages.discoverRecipe.tabTitle" },
});

const editDiscoverRecipeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "discover/$discoverRecipeId/edit",
  component: lazyRouteComponent(
    () =>
      import("../pages/discover-components/publish-discover-recipe/PublishDiscoverRecipePage"),
    "PublishDiscoverRecipePage",
  ),
  staticData: { titleKey: "pages.publishDiscoverRecipe.tabTitle" },
});

const discoverRecipeCookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "discover/$discoverRecipeId/cook",
  component: lazyRouteComponent(
    () => import("../pages/recipe-components/cook/DiscoverRecipeCookPage"),
    "DiscoverRecipeCookPage",
  ),
  staticData: { titleKey: "pages.cook.tabTitle", cookMode: true },
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/settings/SettingsPage"),
    "SettingsPage",
  ),
  staticData: { titleKey: "pages.settings.tabTitle" },
});

const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/account",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/account/AccountPage"),
    "AccountPage",
  ),
  staticData: { titleKey: "pages.account.tabTitle" },
});

const peopleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "people",
  component: lazyRouteComponent(
    () => import("../pages/social/people/PeoplePage"),
    "PeoplePage",
  ),
  staticData: { titleKey: "pages.people.tabTitle" },
});

const myProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "people/my-profile",
  component: lazyRouteComponent(
    () => import("../pages/social/my-profile/MyProfilePage"),
    "MyProfilePage",
  ),
  staticData: { titleKey: "pages.myProfile.tabTitle" },
});

const blockedUsersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "people/blocked-users",
  component: lazyRouteComponent(
    () => import("../pages/social/blocked-users/BlockedUsersPage"),
    "BlockedUsersPage",
  ),
  staticData: { titleKey: "pages.blockedUsers.tabTitle" },
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "people/$handle",
  component: lazyRouteComponent(
    () => import("../pages/social/profile/ProfilePage"),
    "ProfilePage",
  ),
  staticData: { titleKey: "pages.profile.tabTitle" },
});

const exportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/export",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/export/ExportPage"),
    "ExportPage",
  ),
  staticData: { titleKey: "pages.export.tabTitle" },
});

const jobsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/jobs",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/jobs/JobsPage"),
    "JobsPage",
  ),
  staticData: { titleKey: "pages.jobs.tabTitle" },
});

const serverSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/server",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/server-settings/ServerSettingsPage"),
    "ServerSettingsPage",
  ),
  staticData: { titleKey: "pages.serverSettings.tabTitle" },
});

const toolsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tools",
  component: lazyRouteComponent(
    () => import("../pages/tools/ToolsPage"),
    "ToolsPage",
  ),
  staticData: { titleKey: "pages.tools.tabTitle" },
});

const cookbookGeneratorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tools/cookbook",
  component: lazyRouteComponent(
    () => import("../pages/tools/cookbook-generator/CookbookGeneratorPage"),
    "CookbookGeneratorPage",
  ),
  staticData: { titleKey: "pages.cookbook.tabTitle" },
});

const nutritionCalculatorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tools/nutrition",
  component: lazyRouteComponent(
    () => import("../pages/tools/nutrition-calculator/NutritionCalculatorPage"),
    "NutritionCalculatorPage",
  ),
  staticData: { titleKey: "pages.nutritionCalculator.tabTitle" },
});

const measurementConverterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tools/conversions",
  component: lazyRouteComponent(
    () =>
      import("../pages/tools/measurement-converter/MeasurementConverterPage"),
    "MeasurementConverterPage",
  ),
  staticData: { titleKey: "pages.measurementConverter.tabTitle" },
});

const cookingTemperaturesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tools/cooking-temperatures",
  component: lazyRouteComponent(
    () => import("../pages/tools/cooking-temperatures/CookingTemperaturesPage"),
    "CookingTemperaturesPage",
  ),
  staticData: { titleKey: "pages.cookingTemperatures.tabTitle" },
});

const panBakewareConverterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tools/pan-bakeware-converter",
  component: lazyRouteComponent(
    () =>
      import("../pages/tools/pan-bakeware-converter/PanBakewareConverterPage"),
    "PanBakewareConverterPage",
  ),
  staticData: { titleKey: "pages.panBakewareConverter.tabTitle" },
});

const searchByIngredientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "tools/search-by-ingredients",
  component: lazyRouteComponent(
    () =>
      import("../pages/tools/search-by-ingredients/SearchByIngredientsPage"),
    "SearchByIngredientsPage",
  ),
  staticData: { titleKey: "pages.searchByIngredients.tabTitle" },
});

const importRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/import/ImportPage"),
    "ImportPage",
  ),
  staticData: { titleKey: "pages.import.tabTitle" },
});

const importLivingcookbookRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/livingcookbook",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-livingcookbook/ImportLivingcookbookPage"),
    "ImportLivingcookbookPage",
  ),
  staticData: { titleKey: "pages.importLivingCookbook.tabTitle" },
});

const importPaprikaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/paprika",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-paprika/ImportPaprikaPage"),
    "ImportPaprikaPage",
  ),
  staticData: { titleKey: "pages.importPaprika.tabTitle" },
});

const importMelaRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/mela",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/import-mela/ImportMelaPage"),
    "ImportMelaPage",
  ),
  staticData: { titleKey: "pages.importMela.tabTitle" },
});

const importCroutonRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/crouton",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-crouton/ImportCroutonPage"),
    "ImportCroutonPage",
  ),
  staticData: { titleKey: "pages.importCrouton.tabTitle" },
});

const importCookbookManagerComRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/cookbookmanagercom",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-cookbookmanagercom/ImportCookbookManagerComPage"),
    "ImportCookbookManagerComPage",
  ),
  staticData: { titleKey: "pages.importCookbookManagerCom.tabTitle" },
});

const importFlavorishRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/flavorish",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-flavorish/ImportFlavorishPage"),
    "ImportFlavorishPage",
  ),
  staticData: { titleKey: "pages.importFlavorish.tabTitle" },
});

const importJSONLDRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/json-ld",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-json-ld/ImportJSONLDPage"),
    "ImportJSONLDPage",
  ),
  staticData: { titleKey: "pages.importJsonLD.tabTitle" },
});

const importCookmateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/cookmate",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-cookmate/ImportCookmatePage"),
    "ImportCookmatePage",
  ),
  staticData: { titleKey: "pages.importCookmate.tabTitle" },
});

const importCopymethatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/copymethat",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-copymethat/ImportCopymethatPage"),
    "ImportCopymethatPage",
  ),
  staticData: { titleKey: "pages.importCopymethat.tabTitle" },
});

const importRecipeKeeperRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/recipe-keeper",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-recipekeeper/ImportRecipeKeeperPage"),
    "ImportRecipeKeeperPage",
  ),
  staticData: { titleKey: "pages.importRecipeKeeper.tabTitle" },
});

const importPepperplateRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/pepperplate",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-pepperplate/ImportPepperplatePage"),
    "ImportPepperplatePage",
  ),
  staticData: { titleKey: "pages.importPepperplate.tabTitle" },
});

const importTextfilesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/textfiles",
  component: lazyRouteComponent(
    () =>
      import("../pages/settings-components/import-textfiles/ImportTextfilesPage"),
    "ImportTextfilesPage",
  ),
  staticData: { titleKey: "pages.importTextfiles.tabTitle" },
});

const importEnexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/enex",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/import-enex/ImportEnexPage"),
    "ImportEnexPage",
  ),
  staticData: { titleKey: "pages.importEnex.tabTitle" },
});

const importUrlsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/urls",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/import-urls/ImportUrlsPage"),
    "ImportUrlsPage",
  ),
  staticData: { titleKey: "pages.importUrls.tabTitle" },
});

const importCSVRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/csv",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/import-csv/ImportCSVPage"),
    "ImportCSVPage",
  ),
  staticData: { titleKey: "pages.importCSV.tabTitle" },
});

const importPDFsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/pdfs",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/import-pdfs/ImportPDFsPage"),
    "ImportPDFsPage",
  ),
  staticData: { titleKey: "pages.importPDFs.tabTitle" },
});

const importImagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "settings/import/images",
  component: lazyRouteComponent(
    () => import("../pages/settings-components/import-images/ImportImagesPage"),
    "ImportImagesPage",
  ),
  staticData: { titleKey: "pages.importImages.tabTitle" },
});

const shoppingListsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "shopping-lists",
  component: lazyRouteComponent(
    () =>
      import("../pages/shopping-list-components/shopping-lists/ShoppingListsPage"),
    "ShoppingListsPage",
  ),
  staticData: { titleKey: "pages.shoppingLists.tabTitle" },
});

const shoppingListRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "shopping-lists/$shoppingListId",
  component: lazyRouteComponent(
    () =>
      import("../pages/shopping-list-components/shopping-list/ShoppingListPage"),
    "ShoppingListPage",
  ),
  staticData: { titleKey: "pages.shoppingList.tabTitle" },
});

const legacyAboutDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "about-details",
  beforeLoad: () => {
    throw redirect({ to: "/about/details", replace: true });
  },
});

const legacyLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "login",
  beforeLoad: () => {
    throw redirect({
      to: "/auth/$authType",
      params: { authType: "login" },
      replace: true,
    });
  },
});

const legacyEditRecipeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "edit-recipe",
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  homeRoute,
  labelsRoute,
  aboutRoute,
  downloadAndInstallRoute,
  aboutDetailsRoute,
  contactRoute,
  legalRoute,
  contributeRoute,
  contributeCancelRoute,
  contributeThankYouRoute,
  extensionAuthRoute,
  getStartedRoute,
  welcomeFlowRoute,
  authRoute,
  mealPlansRoute,
  mealPlanRoute,
  assistantRoute,
  messagesRoute,
  messageThreadRoute,
  editRecipeRoute,
  recipeRoute,
  recipeCookRoute,
  publishDiscoverRecipeRoute,
  discoverRoute,
  discoverRecipeRoute,
  editDiscoverRecipeRoute,
  discoverRecipeCookRoute,
  settingsRoute,
  accountRoute,
  peopleRoute,
  myProfileRoute,
  blockedUsersRoute,
  profileRoute,
  exportRoute,
  jobsRoute,
  serverSettingsRoute,
  toolsRoute,
  cookbookGeneratorRoute,
  nutritionCalculatorRoute,
  measurementConverterRoute,
  cookingTemperaturesRoute,
  panBakewareConverterRoute,
  searchByIngredientsRoute,
  importRoute,
  importLivingcookbookRoute,
  importPaprikaRoute,
  importMelaRoute,
  importCroutonRoute,
  importCookbookManagerComRoute,
  importFlavorishRoute,
  importJSONLDRoute,
  importCookmateRoute,
  importCopymethatRoute,
  importRecipeKeeperRoute,
  importPepperplateRoute,
  importTextfilesRoute,
  importEnexRoute,
  importUrlsRoute,
  importCSVRoute,
  importPDFsRoute,
  importImagesRoute,
  shoppingListsRoute,
  shoppingListRoute,
  legacyAboutDetailsRoute,
  legacyLoginRoute,
  legacyEditRecipeRoute,
]);
