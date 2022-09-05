import { Injectable } from '@angular/core';

import { PreferencesService, GlobalPreferenceKey } from '@/services/preferences.service';
import { FeatureFlagService, GlobalFeatureFlagKeys } from '@/services/feature-flag.service';
import { RecipeService } from '@/services/recipe.service';
import { EventService } from '@/services/event.service';

@Injectable({
  providedIn: 'root'
})
export class OfflineCacheService {
  knownRecipeIds = new Set();
  constructor(
    private preferencesService: PreferencesService,
    private featureFlagService: FeatureFlagService,
    private recipeService: RecipeService,
    private events: EventService
  ) {
    const ffEnabled = this.featureFlagService.flags[GlobalFeatureFlagKeys.EnableExperimentalOfflineCache];
    const preferenceEnabled = this.preferencesService.preferences[GlobalPreferenceKey.EnableExperimentalOfflineCache];

    if (ffEnabled && preferenceEnabled) {
      this.events.subscribe('recipe:created', () => {
        this.updateAllRecipeLists();
      });

      this.events.subscribe('recipe:updated', () => {
        this.updateAllRecipeLists();
      });

      this.events.subscribe('recipe:deleted', () => {
        this.updateAllRecipeLists();
      });
    }
  }

  async fullSync() {
    await this.updateAllRecipeLists();
    await this.updateAllRecipes();
  }

  async syncPause() {
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  async updateAllRecipes() {
    const knownRecipeIds = Array.from(this.knownRecipeIds);
    for (const knownRecipeId of knownRecipeIds) {
      await this.updateRecipe(knownRecipeId);

      await this.syncPause();
    }
  }

  async updateRecipe(recipeId) {
    await this.recipeService.fetchById(recipeId);
  }

  async updateAllRecipeLists() {
    const sorts = [
      '-title',
      '-createdAt',
      'createdAt',
      '-updatedAt',
      'updatedAt'
    ];
    for (const sort of sorts) {
      await this.updateRecipeList('main', sort);
    }
  }

  async updateRecipeList(folder: string, sort: string) {
    const firstFetch = await this.recipeService.fetch({
      folder,
      sort,
      count: 50,
      offset: 0
    });

    if (!firstFetch.success) return;

    firstFetch.data.map(el => this.knownRecipeIds.add(el.id));

    await this.syncPause();

    const pageCount = Math.ceil(firstFetch.data.totalCount / 50);
    for (let i = 1; i < pageCount; i++) {
      const page = await this.recipeService.fetch({
        folder: 'main',
        sort: '-title',
        count: 50,
        offset: i * 50
      });

      page.data.map(el => this.knownRecipeIds.add(el.id));

      await this.syncPause();
    }
  }
}
