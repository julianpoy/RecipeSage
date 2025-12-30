import { Routes } from "@angular/router";

import { RouteMap } from "./services/util.service";
import { DefaultPageGuardService } from "./services/default-page-guard.service";
import { UnsavedChangesGuardService } from "./services/unsaved-changes-guard.service";

export const appRoutes: Routes = [
  {
    path: "",
    loadComponent: () =>
      import("./pages/info-components/welcome/welcome.page").then(
        (m) => m.WelcomePage,
      ),
    pathMatch: "full",
    canActivate: [DefaultPageGuardService],
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.welcome.tabTitle",
  },
  {
    path: RouteMap.HomePage.path,
    loadComponent: () =>
      import("./pages/home/home.page").then((m) => m.HomePage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.home.tabTitle",
  },
  {
    path: RouteMap.LabelsPage.path,
    loadComponent: () =>
      import("./pages/labels-pages/labels/labels.page").then(
        (m) => m.LabelsPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.labels.tabTitle",
  },
  {
    path: RouteMap.AboutPage.path,
    loadComponent: () =>
      import("./pages/info-components/about/about.page").then(
        (m) => m.AboutPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.about.tabTitle",
  },
  {
    path: RouteMap.DownloadAndInstallPage.path,
    loadComponent: () =>
      import(
        "./pages/info-components/download-and-install/download-and-install.page"
      ).then((m) => m.DownloadAndInstallPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.downloadAndInstall.tabTitle",
  },
  {
    path: RouteMap.AboutDetailsPage.path,
    loadComponent: () =>
      import("./pages/info-components/about-details/about-details.page").then(
        (m) => m.AboutDetailsPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.aboutDetails.tabTitle",
  },
  {
    path: RouteMap.ContactPage.path,
    loadComponent: () =>
      import("./pages/info-components/contact/contact.page").then(
        (m) => m.ContactPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.contact.tabTitle",
  },
  {
    path: RouteMap.LegalPage.path,
    loadComponent: () =>
      import("./pages/info-components/legal/legal.page").then(
        (m) => m.LegalPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.legal.tabTitle",
  },
  {
    path: RouteMap.ContributePage.path,
    loadComponent: () =>
      import("./pages/info-components/contribute/contribute.page").then(
        (m) => m.ContributePage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.contribute.tabTitle",
  },
  {
    path: RouteMap.ContributeCancelPage.path,
    loadComponent: () =>
      import(
        "./pages/info-components/contribute-cancel/contribute-cancel.page"
      ).then((m) => m.ContributeCancelPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.contributeCancel.tabTitle",
  },
  {
    path: RouteMap.ContributeThankYouPage.path,
    loadComponent: () =>
      import(
        "./pages/info-components/contribute-thankyou/contribute-thankyou.page"
      ).then((m) => m.ContributeThankYouPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.contributeThankYou.tabTitle",
  },
  {
    path: RouteMap.WelcomePage.path,
    loadComponent: () =>
      import("./pages/info-components/welcome/welcome.page").then(
        (m) => m.WelcomePage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.welcome.tabTitle",
  },
  {
    path: RouteMap.AuthPage.path,
    loadComponent: () =>
      import("./pages/auth/auth.page").then((m) => m.AuthPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.auth.tabTitle",
  },
  {
    path: RouteMap.MealPlansPage.path,
    loadComponent: () =>
      import("./pages/meal-plan-components/meal-plans/meal-plans.page").then(
        (m) => m.MealPlansPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.mealPlans.tabTitle",
  },
  {
    path: RouteMap.MealPlanPage.path,
    loadComponent: () =>
      import("./pages/meal-plan-components/meal-plan/meal-plan.page").then(
        (m) => m.MealPlanPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.mealPlan.tabTitle",
  },
  {
    path: RouteMap.AssistantPage.path,
    loadComponent: () =>
      import("./pages/messaging-components/assistant/assistant.page").then(
        (m) => m.AssistantPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.assistant.tabTitle",
  },
  {
    path: RouteMap.MessagesPage.path,
    loadComponent: () =>
      import("./pages/messaging-components/messages/messages.page").then(
        (m) => m.MessagesPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.messages.tabTitle",
  },
  {
    path: RouteMap.MessageThreadPage.path,
    loadComponent: () =>
      import(
        "./pages/messaging-components/message-thread/message-thread.page"
      ).then((m) => m.MessageThreadPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.messageThread.tabTitle",
  },
  {
    path: RouteMap.EditRecipePage.path,
    loadComponent: () =>
      import("./pages/recipe-components/edit-recipe/edit-recipe.page").then(
        (m) => m.EditRecipePage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.editRecipe.tabTitle",
  },
  {
    path: RouteMap.RecipePage.path,
    loadComponent: () =>
      import("./pages/recipe-components/recipe/recipe.page").then(
        (m) => m.RecipePage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.recipeDetails.tabTitle",
  },
  {
    path: RouteMap.SettingsPage.path,
    loadComponent: () =>
      import("./pages/settings-components/settings/settings.page").then(
        (m) => m.SettingsPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.settings.tabTitle",
  },
  {
    path: RouteMap.AccountPage.path,
    loadComponent: () =>
      import("./pages/settings-components/account/account.page").then(
        (m) => m.AccountPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.account.tabTitle",
  },
  {
    path: RouteMap.PeoplePage.path,
    loadComponent: () =>
      import("./pages/social/people/people.page").then((m) => m.PeoplePage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.people.tabTitle",
  },
  {
    path: RouteMap.MyProfilePage.path,
    loadComponent: () =>
      import("./pages/social/my-profile/my-profile.page").then(
        (m) => m.MyProfilePage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.myProfile.tabTitle",
  },
  {
    path: RouteMap.ProfilePage.path,
    loadComponent: () =>
      import("./pages/social/profile/profile.page").then((m) => m.ProfilePage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.profile.tabTitle",
  },
  {
    path: RouteMap.ExportPage.path,
    loadComponent: () =>
      import("./pages/settings-components/export/export.page").then(
        (m) => m.ExportPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.export.tabTitle",
  },
  {
    path: RouteMap.ImportPage.path,
    loadComponent: () =>
      import("./pages/settings-components/import/import.page").then(
        (m) => m.ImportPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.import.tabTitle",
  },
  {
    path: RouteMap.ImportLivingcookbookPage.path,
    loadComponent: () =>
      import(
        "./pages/settings-components/import-livingcookbook/import-livingcookbook.page"
      ).then((m) => m.ImportLivingcookbookPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importLivingCookbook.tabTitle",
  },
  {
    path: RouteMap.ImportPaprikaPage.path,
    loadComponent: () =>
      import(
        "./pages/settings-components/import-paprika/import-paprika.page"
      ).then((m) => m.ImportPaprikaPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importPaprika.tabTitle",
  },
  {
    path: RouteMap.ImportJSONLDPage.path,
    loadComponent: () =>
      import(
        "./pages/settings-components/import-json-ld/import-json-ld.page"
      ).then((m) => m.ImportJSONLDPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importJsonLD.tabTitle",
  },
  {
    path: RouteMap.ImportCookmatePage.path,
    loadComponent: () =>
      import(
        "./pages/settings-components/import-cookmate/import-cookmate.page"
      ).then((m) => m.ImportCookmatePage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importCookmate.tabTitle",
  },
  {
    path: RouteMap.ImportCopymethatPage.path,
    loadComponent: () =>
      import(
        "./pages/settings-components/import-copymethat/import-copymethat.page"
      ).then((m) => m.ImportCopymethatPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importCopymethat.tabTitle",
  },
  {
    path: RouteMap.ImportRecipeKeeperPage.path,
    loadComponent: () =>
      import(
        "./pages/settings-components/import-recipekeeper/import-recipekeeper.page"
      ).then((m) => m.ImportRecipeKeeperPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importRecipeKeeper.tabTitle",
  },
  {
    path: RouteMap.ImportPepperplatePage.path,
    loadComponent: () =>
      import(
        "./pages/settings-components/import-pepperplate/import-pepperplate.page"
      ).then((m) => m.ImportPepperplatePage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importPepperplate.tabTitle",
  },
  {
    path: RouteMap.ImportTextfilesPage.path,
    loadComponent: () =>
      import(
        "./pages/settings-components/import-textfiles/import-textfiles.page"
      ).then((m) => m.ImportTextfilesPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importTextfiles.tabTitle",
  },
  {
    path: RouteMap.ImportEnexPage.path,
    loadComponent: () =>
      import("./pages/settings-components/import-enex/import-enex.page").then(
        (m) => m.ImportEnexPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importEnex.tabTitle",
  },
  {
    path: RouteMap.ImportUrlsPage.path,
    loadComponent: () =>
      import("./pages/settings-components/import-urls/import-urls.page").then(
        (m) => m.ImportUrlsPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importUrls.tabTitle",
  },
  {
    path: RouteMap.ImportCSVPage.path,
    loadComponent: () =>
      import("./pages/settings-components/import-csv/import-csv.page").then(
        (m) => m.ImportCSVPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importCSV.tabTitle",
  },
  {
    path: RouteMap.ImportPDFsPage.path,
    loadComponent: () =>
      import("./pages/settings-components/import-pdfs/import-pdfs.page").then(
        (m) => m.ImportPDFsPage,
      ),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importPDFs.tabTitle",
  },
  {
    path: RouteMap.ImportImagesPage.path,
    loadComponent: () =>
      import(
        "./pages/settings-components/import-images/import-images.page"
      ).then((m) => m.ImportImagesPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.importImages.tabTitle",
  },
  {
    path: RouteMap.ShoppingListsPage.path,
    loadComponent: () =>
      import(
        "./pages/shopping-list-components/shopping-lists/shopping-lists.page"
      ).then((m) => m.ShoppingListsPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.shoppingLists.tabTitle",
  },
  {
    path: RouteMap.ShoppingListPage.path,
    loadComponent: () =>
      import(
        "./pages/shopping-list-components/shopping-list/shopping-list.page"
      ).then((m) => m.ShoppingListPage),
    canDeactivate: [UnsavedChangesGuardService],
    title: "pages.shoppingList.tabTitle",
  },
  // Legacy redirects
  { path: "about-details", redirectTo: "/about/details", pathMatch: "full" },
  { path: "login", redirectTo: "/auth/login", pathMatch: "full" },
  { path: "edit-recipe", redirectTo: "/", pathMatch: "full" },
  // Catchall
  {
    path: "**",
    loadComponent: () =>
      import("./pages/error-pages/not-found/not-found.page").then(
        (m) => m.NotFoundPage,
      ),
  },
];
