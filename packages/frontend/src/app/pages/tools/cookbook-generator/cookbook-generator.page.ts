import { Component, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  type ItemReorderEventDetail,
} from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";
import type { LabelSummary, RecipeSummary } from "@recipesage/prisma";
import {
  add,
  informationCircleOutline,
  pricetag,
  removeCircle,
} from "ionicons/icons";
import { addIcons } from "ionicons";

import { RouteMap } from "../../../services/util.service";
import { ServerActionsService } from "../../../services/server-actions.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { SelectRecipeModalComponent } from "../../../components/select-recipe-modal/select-recipe-modal.component";
import { SelectLabelModalComponent } from "../../../components/select-label-modal/select-label-modal.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonToggle,
  IonReorderGroup,
  IonReorder,
  IonButton,
  IonIcon,
  IonSpinner,
  IonText,
} from "@ionic/angular/standalone";

const MAX_RECIPES = 1000;
const RECIPE_PAGE_SIZE = 200;

interface CookbookRecipe {
  id: string;
  title: string;
}

@Component({
  standalone: true,
  selector: "page-cookbook-generator",
  templateUrl: "cookbook-generator.page.html",
  styleUrls: ["cookbook-generator.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonToggle,
    IonReorderGroup,
    IonReorder,
    IonButton,
    IonIcon,
    IonSpinner,
    IonText,
  ],
})
export class CookbookGeneratorPage {
  private navCtrl = inject(NavController);
  private modalCtrl = inject(ModalController);
  private translate = inject(TranslateService);
  private serverActionsService = inject(ServerActionsService);

  defaultBackHref: string = RouteMap.ToolsPage.getPath();

  title = "";
  subtitle = "";
  introduction = "";
  author = "";
  includeToc = true;
  includeImages = true;

  recipes: CookbookRecipe[] = [];
  loadingRecipes = false;
  startingJob = false;

  maxRecipes = MAX_RECIPES;

  constructor() {
    addIcons({ add, informationCircleOutline, pricetag, removeCircle });
  }

  goToExport() {
    this.navCtrl.navigateForward(RouteMap.ExportPage.getPath());
  }

  async addRecipe() {
    const modal = await this.modalCtrl.create({
      component: SelectRecipeModalComponent,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss<RecipeSummary>();
    if (!data) return;
    this.addRecipes([{ id: data.id, title: data.title }]);
  }

  async addLabel() {
    const modal = await this.modalCtrl.create({
      component: SelectLabelModalComponent,
    });
    await modal.present();
    const { data } = await modal.onDidDismiss<LabelSummary>();
    if (!data) return;
    await this.addRecipesFromLabel(data.title);
  }

  private async addRecipesFromLabel(labelTitle: string) {
    this.loadingRecipes = true;

    const collected = new Map<string, CookbookRecipe>();
    let offset = 0;
    while (true) {
      const response = await this.serverActionsService.recipes.getRecipes({
        folder: "main",
        orderBy: "title",
        orderDirection: "asc",
        offset,
        limit: RECIPE_PAGE_SIZE,
        labels: [labelTitle],
      });
      if (!response) break;

      for (const recipe of response.recipes) {
        collected.set(recipe.id, { id: recipe.id, title: recipe.title });
      }
      offset += response.recipes.length;

      if (response.recipes.length === 0 || offset >= response.totalCount) {
        break;
      }
    }

    this.loadingRecipes = false;
    this.addRecipes([...collected.values()]);
  }

  private addRecipes(newRecipes: CookbookRecipe[]) {
    const existingIds = new Set(this.recipes.map((recipe) => recipe.id));
    for (const recipe of newRecipes) {
      if (existingIds.has(recipe.id)) continue;
      existingIds.add(recipe.id);
      this.recipes.push(recipe);
    }
  }

  removeRecipe(recipe: CookbookRecipe) {
    this.recipes = this.recipes.filter((item) => item.id !== recipe.id);
  }

  onReorder(event: CustomEvent<ItemReorderEventDetail>) {
    const item = this.recipes.splice(event.detail.from, 1)?.[0];
    if (item) {
      this.recipes.splice(event.detail.to, 0, item);
    }
    event.detail.complete(false);
  }

  canGenerate() {
    return (
      this.title.trim().length > 0 &&
      this.recipes.length > 0 &&
      this.recipes.length <= MAX_RECIPES
    );
  }

  async generate() {
    if (!this.canGenerate() || this.startingJob) return;

    this.startingJob = true;
    const response = await this.serverActionsService.jobs.startCookbookJob({
      title: this.title.trim(),
      subtitle: this.subtitle.trim() || undefined,
      introduction: this.introduction.trim() || undefined,
      author: this.author.trim() || undefined,
      includeToc: this.includeToc,
      includeImages: this.includeImages,
      recipeIds: this.recipes.map((recipe) => recipe.id),
    });
    this.startingJob = false;

    if (response) {
      this.navCtrl.navigateForward(RouteMap.JobsPage.getPath());
    }
  }
}
