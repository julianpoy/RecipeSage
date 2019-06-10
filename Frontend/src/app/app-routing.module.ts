import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: localStorage.getItem('token') ? 'list/main' : 'welcome',
    pathMatch: 'full'
  },
  {
    path: 'list/:folder',
    loadChildren: './pages/home/home.module#HomePageModule'
  },
  {
    path: 'about',
    loadChildren: './pages/info-components/about/about.module#AboutPageModule'
  },
  {
    path: 'about/details',
    loadChildren: './pages/info-components/about-details/about-details.module#AboutDetailsPageModule'
  },
  {
    path: 'legal',
    loadChildren: './pages/info-components/legal/legal.module#LegalPageModule'
  },
  {
    path: 'contribute',
    loadChildren: './pages/info-components/contribute/contribute.module#ContributePageModule'
  },
  {
    path: 'contribute/cancel',
    loadChildren: './pages/info-components/contribute-cancel/contribute-cancel.module#ContributeCancelPageModule'
  },
  {
    path: 'contribute/thankyou',
    loadChildren: './pages/info-components/contribute-thankyou/contribute-thankyou.module#ContributeThankYouPageModule'
  },
  {
    path: 'release-notes',
    loadChildren: './pages/info-components/release-notes/release-notes.module#ReleaseNotesPageModule'
  },
  {
    path: 'tips-tricks-tutorials',
    loadChildren: './pages/info-components/tips-tricks-tutorials/tips-tricks-tutorials.module#TipsTricksTutorialsPageModule'
  },
  {
    path: 'welcome',
    loadChildren: './pages/info-components/welcome/welcome.module#WelcomePageModule'
  },
  {
    path: 'login',
    loadChildren: './pages/login/login.module#LoginPageModule'
  },
  {
    path: 'meal-planners',
    loadChildren: './pages/meal-plan-components/meal-plans/meal-plans.module#MealPlansPageModule'
  },
  {
    path: 'meal-planners/:mealPlanId',
    loadChildren: './pages/meal-plan-components/meal-plan/meal-plan.module#MealPlanPageModule'
  },
  {
    path: 'messages',
    loadChildren: './pages/messaging-components/messages/messages.module#MessagesPageModule'
  },
  {
    path: 'messages/:otherUserId',
    loadChildren: './pages/messaging-components/message-thread/message-thread.module#MessageThreadPageModule'
  },
  {
    path: 'edit-recipe/:recipeId',
    loadChildren: './pages/recipe-components/edit-recipe/edit-recipe.module#EditRecipePageModule'
  },
  {
    path: 'recipe/:recipeId',
    loadChildren: './pages/recipe-components/recipe/recipe.module#RecipePageModule'
  },
  {
    path: 'settings',
    loadChildren: './pages/settings-components/settings/settings.module#SettingsPageModule'
  },
  {
    path: 'settings/account',
    loadChildren: './pages/settings-components/account/account.module#AccountPageModule'
  },
  {
    path: 'settings/export',
    loadChildren: './pages/settings-components/export/export.module#ExportPageModule'
  },
  {
    path: 'settings/import',
    loadChildren: './pages/settings-components/import/import.module#ImportPageModule'
  },
  {
    path: 'settings/import/livingcookbook',
    loadChildren: './pages/settings-components/import-livingcookbook/import-livingcookbook.module#ImportLivingcookbookPageModule'
  },
  {
    path: 'settings/import/paprika',
    loadChildren: './pages/settings-components/import-paprika/import-paprika.module#ImportPaprikaPageModule'
  },
  {
    path: 'settings/import/pepperplate',
    loadChildren: './pages/settings-components/import-pepperplate/import-pepperplate.module#ImportPepperplatePageModule'
  },
  {
    path: 'shopping-lists',
    loadChildren: './pages/shopping-list-components/shopping-lists/shopping-lists.module#ShoppingListsPageModule'
  },
  {
    path: 'shopping-lists/:shoppingListId',
    loadChildren: './pages/shopping-list-components/shopping-list/shopping-list.module#ShoppingListPageModule'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
