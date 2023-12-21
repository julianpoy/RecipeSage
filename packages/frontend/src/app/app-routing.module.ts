import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";

import { RouteMap } from "./services/util.service";
import { DefaultPageGuardService } from "./services/default-page-guard.service";
import { UnsavedChangesGuardService } from "./services/unsaved-changes-guard.service";

const routes: Routes = [
  {
    path: "",
    loadChildren: () =>
      import("~/pages/info-components/welcome/welcome.module").then(
        (module) => module.WelcomePageModule,
      ),
    pathMatch: "full",
    canActivate: [DefaultPageGuardService],
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.HomePage.path,
    loadChildren: () =>
      import("~/pages/home/home.module").then(
        (module) => module.HomePageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.LabelsPage.path,
    loadChildren: () =>
      import("~/pages/labels-pages/labels/labels.module").then(
        (module) => module.LabelsPageModule,
      ),
  },
  {
    path: RouteMap.AboutPage.path,
    loadChildren: () =>
      import("~/pages/info-components/about/about.module").then(
        (module) => module.AboutPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.DownloadAndInstallPage.path,
    loadChildren: () =>
      import(
        "~/pages/info-components/download-and-install/download-and-install.module"
      ).then((module) => module.DownloadAndInstallPageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.AboutDetailsPage.path,
    loadChildren: () =>
      import("~/pages/info-components/about-details/about-details.module").then(
        (module) => module.AboutDetailsPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ContactPage.path,
    loadChildren: () =>
      import("~/pages/info-components/contact/contact.module").then(
        (module) => module.ContactPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.LegalPage.path,
    loadChildren: () =>
      import("~/pages/info-components/legal/legal.module").then(
        (module) => module.LegalPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ContributePage.path,
    loadChildren: () =>
      import("~/pages/info-components/contribute/contribute.module").then(
        (module) => module.ContributePageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ContributeCancelPage.path,
    loadChildren: () =>
      import(
        "~/pages/info-components/contribute-cancel/contribute-cancel.module"
      ).then((module) => module.ContributeCancelPageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ContributeThankYouPage.path,
    loadChildren: () =>
      import(
        "~/pages/info-components/contribute-thankyou/contribute-thankyou.module"
      ).then((module) => module.ContributeThankYouPageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.WelcomePage.path,
    loadChildren: () =>
      import("~/pages/info-components/welcome/welcome.module").then(
        (module) => module.WelcomePageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.AuthPage.path,
    loadChildren: () =>
      import("~/pages/auth/auth.module").then(
        (module) => module.AuthPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.MealPlansPage.path,
    loadChildren: () =>
      import("~/pages/meal-plan-components/meal-plans/meal-plans.module").then(
        (module) => module.MealPlansPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.MealPlanPage.path,
    loadChildren: () =>
      import("~/pages/meal-plan-components/meal-plan/meal-plan.module").then(
        (module) => module.MealPlanPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.AssistantPage.path,
    loadChildren: () =>
      import("~/pages/messaging-components/assistant/assistant.module").then(
        (module) => module.AssistantPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.MessagesPage.path,
    loadChildren: () =>
      import("~/pages/messaging-components/messages/messages.module").then(
        (module) => module.MessagesPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.MessageThreadPage.path,
    loadChildren: () =>
      import(
        "~/pages/messaging-components/message-thread/message-thread.module"
      ).then((module) => module.MessageThreadPageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.EditRecipePage.path,
    loadChildren: () =>
      import("~/pages/recipe-components/edit-recipe/edit-recipe.module").then(
        (module) => module.EditRecipePageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.RecipePage.path,
    loadChildren: () =>
      import("~/pages/recipe-components/recipe/recipe.module").then(
        (module) => module.RecipePageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.SettingsPage.path,
    loadChildren: () =>
      import("~/pages/settings-components/settings/settings.module").then(
        (module) => module.SettingsPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.AccountPage.path,
    loadChildren: () =>
      import("~/pages/settings-components/account/account.module").then(
        (module) => module.AccountPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.PeoplePage.path,
    loadChildren: () =>
      import("~/pages/social/people/people.module").then(
        (module) => module.PeoplePageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.MyProfilePage.path,
    loadChildren: () =>
      import("~/pages/social/my-profile/my-profile.module").then(
        (module) => module.MyProfilePageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ProfilePage.path,
    loadChildren: () =>
      import("~/pages/social/profile/profile.module").then(
        (module) => module.ProfilePageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ExportPage.path,
    loadChildren: () =>
      import("~/pages/settings-components/export/export.module").then(
        (module) => module.ExportPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ImportPage.path,
    loadChildren: () =>
      import("~/pages/settings-components/import/import.module").then(
        (module) => module.ImportPageModule,
      ),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ImportLivingcookbookPage.path,
    loadChildren: () =>
      import(
        "~/pages/settings-components/import-livingcookbook/import-livingcookbook.module"
      ).then((module) => module.ImportLivingcookbookPageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ImportPaprikaPage.path,
    loadChildren: () =>
      import(
        "~/pages/settings-components/import-paprika/import-paprika.module"
      ).then((module) => module.ImportPaprikaPageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ImportJSONLDPage.path,
    loadChildren: () =>
      import(
        "~/pages/settings-components/import-json-ld/import-json-ld.module"
      ).then((module) => module.ImportJSONLDPageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ImportCookmatePage.path,
    loadChildren: () =>
      import(
        "~/pages/settings-components/import-cookmate/import-cookmate.module"
      ).then((module) => module.ImportCookmatePageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ImportPepperplatePage.path,
    loadChildren: () =>
      import(
        "~/pages/settings-components/import-pepperplate/import-pepperplate.module"
      ).then((module) => module.ImportPepperplatePageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ShoppingListsPage.path,
    loadChildren: () =>
      import(
        "~/pages/shopping-list-components/shopping-lists/shopping-lists.module"
      ).then((module) => module.ShoppingListsPageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  {
    path: RouteMap.ShoppingListPage.path,
    loadChildren: () =>
      import(
        "~/pages/shopping-list-components/shopping-list/shopping-list.module"
      ).then((module) => module.ShoppingListPageModule),
    canDeactivate: [UnsavedChangesGuardService],
  },
  // Legacy route redirects
  { path: "about-details", redirectTo: "/about/details", pathMatch: "full" },
  { path: "login", redirectTo: "/auth/login", pathMatch: "full" },
  { path: "edit-recipe", redirectTo: "/", pathMatch: "full" },
  // Catchall
  {
    path: "**",
    loadChildren: () =>
      import("~/pages/error-pages/not-found/not-found.module").then(
        (module) => module.NotFoundPageModule,
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      preloadingStrategy: PreloadAllModules,
    }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
