import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

import { RouteMap } from './services/util.service';

const routes: Routes = [
  {
    path: '',
    redirectTo: localStorage.getItem('token') ? 'list/main' : 'welcome',
    pathMatch: 'full'
  },
  RouteMap.HomePage,
  RouteMap.AboutPage,
  RouteMap.AboutDetailsPage,
  RouteMap.LegalPage,
  RouteMap.ContributePage,
  RouteMap.ContributeCancelPage,
  RouteMap.ContributeThankYouPage,
  RouteMap.ReleaseNotesPage,
  RouteMap.TipsTricksTutorialsPage,
  RouteMap.WelcomePage,
  RouteMap.LoginPage,
  RouteMap.MealPlansPage,
  RouteMap.MealPlanPage,
  RouteMap.MessagesPage,
  RouteMap.MessageThreadPage,
  RouteMap.EditRecipePage,
  RouteMap.RecipePage,
  RouteMap.SettingsPage,
  RouteMap.AccountPage,
  RouteMap.ExportPage,
  RouteMap.ImportPage,
  RouteMap.ImportLivingcookbookPage,
  RouteMap.ImportPaprikaPage,
  RouteMap.ImportPepperplatePage,
  RouteMap.ShoppingListsPage,
  RouteMap.ShoppingListPage,
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
