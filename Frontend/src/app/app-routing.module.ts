import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { RouteMap, AuthType } from './services/util.service';
import { DefaultPageGuardService } from './services/default-page-guard.service';
import { UnsavedChangesGuardService } from './services/unsaved-changes-guard.service';

const routes: Routes = [
  {
    path: '',
    loadChildren: '@/pages/info-components/welcome/welcome.module#WelcomePageModule',
    pathMatch: 'full',
    canActivate: [DefaultPageGuardService],
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.HomePage.path,
    loadChildren: '@/pages/home/home.module#HomePageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.LabelsPage.path,
    loadChildren: '@/pages/labels-pages/labels/labels.module#LabelsPageModule'
  },
  {
    path: RouteMap.AboutPage.path,
    loadChildren: '@/pages/info-components/about/about.module#AboutPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.DownloadAndInstallPage.path,
    loadChildren: '@/pages/info-components/download-and-install/download-and-install.module#DownloadAndInstallPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.AboutDetailsPage.path,
    loadChildren: '@/pages/info-components/about-details/about-details.module#AboutDetailsPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ContactPage.path,
    loadChildren: '@/pages/info-components/contact/contact.module#ContactPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.LegalPage.path,
    loadChildren: '@/pages/info-components/legal/legal.module#LegalPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ContributePage.path,
    loadChildren: '@/pages/info-components/contribute/contribute.module#ContributePageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ContributeCancelPage.path,
    loadChildren: '@/pages/info-components/contribute-cancel/contribute-cancel.module#ContributeCancelPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ContributeThankYouPage.path,
    loadChildren: '@/pages/info-components/contribute-thankyou/contribute-thankyou.module#ContributeThankYouPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ReleaseNotesPage.path,
    loadChildren: '@/pages/info-components/release-notes/release-notes.module#ReleaseNotesPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.TipsTricksTutorialsPage.path,
    loadChildren: '@/pages/info-components/tips-tricks-tutorials/tips-tricks-tutorials.module#TipsTricksTutorialsPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.WelcomePage.path,
    loadChildren: '@/pages/info-components/welcome/welcome.module#WelcomePageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.AuthPage.path,
    loadChildren: '@/pages/auth/auth.module#AuthPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.MealPlansPage.path,
    loadChildren: '@/pages/meal-plan-components/meal-plans/meal-plans.module#MealPlansPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.MealPlanPage.path,
    loadChildren: '@/pages/meal-plan-components/meal-plan/meal-plan.module#MealPlanPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.MessagesPage.path,
    loadChildren: '@/pages/messaging-components/messages/messages.module#MessagesPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.MessageThreadPage.path,
    loadChildren: '@/pages/messaging-components/message-thread/message-thread.module#MessageThreadPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.EditRecipePage.path,
    loadChildren: '@/pages/recipe-components/edit-recipe/edit-recipe.module#EditRecipePageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.RecipePage.path,
    loadChildren: '@/pages/recipe-components/recipe/recipe.module#RecipePageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.SettingsPage.path,
    loadChildren: '@/pages/settings-components/settings/settings.module#SettingsPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.AccountPage.path,
    loadChildren: '@/pages/settings-components/account/account.module#AccountPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.PeoplePage.path,
    loadChildren: '@/pages/social/people/people.module#PeoplePageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.MyProfilePage.path,
    loadChildren: '@/pages/social/my-profile/my-profile.module#MyProfilePageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ProfilePage.path,
    loadChildren: '@/pages/social/profile/profile.module#ProfilePageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ExportPage.path,
    loadChildren: '@/pages/settings-components/export/export.module#ExportPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ImportPage.path,
    loadChildren: '@/pages/settings-components/import/import.module#ImportPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ImportLivingcookbookPage.path,
    loadChildren: '@/pages/settings-components/import-livingcookbook/import-livingcookbook.module#ImportLivingcookbookPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ImportPaprikaPage.path,
    loadChildren: '@/pages/settings-components/import-paprika/import-paprika.module#ImportPaprikaPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ImportPepperplatePage.path,
    loadChildren: '@/pages/settings-components/import-pepperplate/import-pepperplate.module#ImportPepperplatePageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ShoppingListsPage.path,
    loadChildren: '@/pages/shopping-list-components/shopping-lists/shopping-lists.module#ShoppingListsPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  {
    path: RouteMap.ShoppingListPage.path,
    loadChildren: '@/pages/shopping-list-components/shopping-list/shopping-list.module#ShoppingListPageModule',
    canDeactivate: [UnsavedChangesGuardService]
  },
  // Legacy route redirects
  { path: 'about-details', redirectTo: '/about/details', pathMatch: 'full' },
  { path: 'login', redirectTo: '/auth/login', pathMatch: 'full' },
  { path: 'edit-recipe', redirectTo: '/', pathMatch: 'full' },
  // Catchall
  { path: '**', loadChildren: '@/pages/error-pages/not-found/not-found.module#NotFoundPageModule' }
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
