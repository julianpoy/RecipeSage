import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { RouteMap } from './services/util.service';
import { DefaultPageGuardService } from './services/default-page-guard.service';

const routes: Routes = [
  {
    path: '',
    loadChildren: '@/pages/info-components/welcome/welcome.module#WelcomePageModule',
    pathMatch: 'full',
    canActivate: [DefaultPageGuardService]
  },
  {
    path: RouteMap.HomePage.path,
    loadChildren: '@/pages/home/home.module#HomePageModule'
  },
  {
    path: RouteMap.LabelsPage.path,
    loadChildren: '@/pages/labels-pages/labels/labels.module#LabelsPageModule'
  },
  {
    path: RouteMap.AboutPage.path,
    loadChildren: '@/pages/info-components/about/about.module#AboutPageModule'
  },
  {
    path: RouteMap.AboutDetailsPage.path,
    loadChildren: '@/pages/info-components/about-details/about-details.module#AboutDetailsPageModule'
  },
  {
    path: RouteMap.LegalPage.path,
    loadChildren: '@/pages/info-components/legal/legal.module#LegalPageModule'
  },
  {
    path: RouteMap.ContributePage.path,
    loadChildren: '@/pages/info-components/contribute/contribute.module#ContributePageModule'
  },
  {
    path: RouteMap.ContributeCancelPage.path,
    loadChildren: '@/pages/info-components/contribute-cancel/contribute-cancel.module#ContributeCancelPageModule'
  },
  {
    path: RouteMap.ContributeThankYouPage.path,
    loadChildren: '@/pages/info-components/contribute-thankyou/contribute-thankyou.module#ContributeThankYouPageModule'
  },
  {
    path: RouteMap.ReleaseNotesPage.path,
    loadChildren: '@/pages/info-components/release-notes/release-notes.module#ReleaseNotesPageModule'
  },
  {
    path: RouteMap.TipsTricksTutorialsPage.path,
    loadChildren: '@/pages/info-components/tips-tricks-tutorials/tips-tricks-tutorials.module#TipsTricksTutorialsPageModule'
  },
  {
    path: RouteMap.WelcomePage.path,
    loadChildren: '@/pages/info-components/welcome/welcome.module#WelcomePageModule'
  },
  {
    path: RouteMap.AuthPage.path,
    loadChildren: '@/pages/auth/auth.module#AuthPageModule'
  },
  {
    path: RouteMap.MealPlansPage.path,
    loadChildren: '@/pages/meal-plan-components/meal-plans/meal-plans.module#MealPlansPageModule'
  },
  {
    path: RouteMap.MealPlanPage.path,
    loadChildren: '@/pages/meal-plan-components/meal-plan/meal-plan.module#MealPlanPageModule'
  },
  {
    path: RouteMap.MessagesPage.path,
    loadChildren: '@/pages/messaging-components/messages/messages.module#MessagesPageModule'
  },
  {
    path: RouteMap.MessageThreadPage.path,
    loadChildren: '@/pages/messaging-components/message-thread/message-thread.module#MessageThreadPageModule'
  },
  {
    path: RouteMap.EditRecipePage.path,
    loadChildren: '@/pages/recipe-components/edit-recipe/edit-recipe.module#EditRecipePageModule'
  },
  {
    path: RouteMap.RecipePage.path,
    loadChildren: '@/pages/recipe-components/recipe/recipe.module#RecipePageModule'
  },
  {
    path: RouteMap.SettingsPage.path,
    loadChildren: '@/pages/settings-components/settings/settings.module#SettingsPageModule'
  },
  {
    path: RouteMap.AccountPage.path,
    loadChildren: '@/pages/settings-components/account/account.module#AccountPageModule'
  },
  {
    path: RouteMap.ExportPage.path,
    loadChildren: '@/pages/settings-components/export/export.module#ExportPageModule'
  },
  {
    path: RouteMap.ImportPage.path,
    loadChildren: '@/pages/settings-components/import/import.module#ImportPageModule'
  },
  {
    path: RouteMap.ImportLivingcookbookPage.path,
    loadChildren: '@/pages/settings-components/import-livingcookbook/import-livingcookbook.module#ImportLivingcookbookPageModule'
  },
  {
    path: RouteMap.ImportPaprikaPage.path,
    loadChildren: '@/pages/settings-components/import-paprika/import-paprika.module#ImportPaprikaPageModule'
  },
  {
    path: RouteMap.ImportPepperplatePage.path,
    loadChildren: '@/pages/settings-components/import-pepperplate/import-pepperplate.module#ImportPepperplatePageModule'
  },
  {
    path: RouteMap.ShoppingListsPage.path,
    loadChildren: '@/pages/shopping-list-components/shopping-lists/shopping-lists.module#ShoppingListsPageModule'
  },
  {
    path: RouteMap.ShoppingListPage.path,
    loadChildren: '@/pages/shopping-list-components/shopping-list/shopping-list.module#ShoppingListPageModule'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      useHash: true,
      preloadingStrategy: PreloadAllModules
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
