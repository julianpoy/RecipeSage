import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, ToastController, ModalController, PopoverController } from '@ionic/angular';
import {TranslateService} from '@ngx-translate/core';

import { linkifyStr } from '@/utils/linkify';
import { RecipeService, Recipe, Instruction, Ingredient, Note } from '@/services/recipe.service';
import { LabelService } from '@/services/label.service';
import { CookingToolbarService } from '@/services/cooking-toolbar.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RouteMap } from '@/services/util.service';
import { CapabilitiesService } from '@/services/capabilities.service';
import { WakeLockService } from '@/services/wakelock.service';
import { PreferencesService, RecipeDetailsPreferenceKey } from '@/services/preferences.service';
import { RecipeCompletionTrackerService } from '@/services/recipe-completion-tracker.service';

import { AddRecipeToShoppingListModalPage } from '../add-recipe-to-shopping-list-modal/add-recipe-to-shopping-list-modal.page';
import { AddRecipeToMealPlanModalPage } from '../add-recipe-to-meal-plan-modal/add-recipe-to-meal-plan-modal.page';
import { PrintRecipeModalPage } from '../print-recipe-modal/print-recipe-modal.page';
import { RecipeDetailsPopoverPage } from '../recipe-details-popover/recipe-details-popover.page';
import { ShareModalPage } from '@/pages/share-modal/share-modal.page';
import { AuthPage } from '@/pages/auth/auth.page';
import { ImageViewerComponent } from '@/modals/image-viewer/image-viewer.component';
import { ScaleRecipeComponent } from '@/modals/scale-recipe/scale-recipe.component';

@Component({
  selector: 'page-recipe',
  templateUrl: 'recipe.page.html',
  styleUrls: ['recipe.page.scss'],
  providers: [ RecipeService, LabelService ]
})
export class RecipePage {

  defaultBackHref: string = RouteMap.HomePage.getPath('main');

  wakeLockRequest: null | {
    release: () => void,
  } = null;

  recipe: Recipe;
  recipeId: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  notes: Note[];

  scale = 1;

  labelObjectsByTitle: any = {};
  existingLabels: string[] = [];
  selectedLabels: string[] = [];
  pendingLabel = '';
  showAutocomplete = false;

  isLoggedIn: boolean;

  constructor(
    public navCtrl: NavController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public modalCtrl: ModalController,
    public popoverCtrl: PopoverController,
    public loadingService: LoadingService,
    public preferencesService: PreferencesService,
    public wakeLockService: WakeLockService,
    public recipeCompletionTrackerService: RecipeCompletionTrackerService,
    public route: ActivatedRoute,
    public utilService: UtilService,
    public recipeService: RecipeService,
    public labelService: LabelService,
    public cookingToolbarService: CookingToolbarService,
    public capabilitiesService: CapabilitiesService,
    public translate: TranslateService,
  ) {

    this.updateIsLoggedIn();

    this.recipeId = this.route.snapshot.paramMap.get('recipeId');
    this.recipe = {} as Recipe;

    this.scale = this.recipeCompletionTrackerService.getRecipeScale(this.recipeId) || 1;

    this.applyScale();

    document.addEventListener('click', event => {
      if (this.showAutocomplete) this.toggleAutocomplete(false, event);
    });
  }

  ionViewWillEnter() {
    const loading = this.loadingService.start();

    this.recipe = {} as Recipe;

    this.loadAll()
    .then(() => {
      loading.dismiss();
    }, () => {
      loading.dismiss();
    });

    this.setupWakeLock();
  }

  ionViewWillLeave() {
    this.releaseWakeLock();
  }

  refresh(loader) {
    this.loadAll()
    .then(() => {
      loader.target.complete();
    }, () => {
      loader.target.complete();
    });

    this.loadLabels();
  }

  updateIsLoggedIn() {
    this.isLoggedIn = !!localStorage.getItem('token');
  }

  loadAll() {
    return Promise.all([this.loadRecipe(), this.loadLabels()]);
  }

  async loadRecipe() {
    const response = await this.recipeService.fetchById(this.recipeId);
    if (!response.success) return;

    this.recipe = response.data;

    if (this.recipe.url && !this.recipe.url.trim().startsWith('http')) {
      this.recipe.url = 'http://' + this.recipe.url.trim();
    }

    if (this.recipe.instructions && this.recipe.instructions.length > 0) {
      this.instructions = this.recipeService.parseInstructions(this.recipe.instructions);
    }

    if (this.recipe.notes && this.recipe.notes.length > 0) {
      this.notes = this.recipeService.parseNotes(this.recipe.notes)
        .map(note => ({
          ...note,
          content: linkifyStr(note.content),
        }));
    }

    this.applyScale();

    this.selectedLabels = this.recipe.labels.map(label => label.title);
  }

  async loadLabels() {
    const response = await this.labelService.fetch();
    if (!response.success) return;

    this.labelObjectsByTitle = {};
    this.existingLabels = [];

    for (const label of response.data) {
      this.existingLabels.push(label.title);
      this.labelObjectsByTitle[label.title] = label;
    }

    this.existingLabels.sort((a, b) => a.localeCompare(b));
  }

  async presentPopover(event) {
    const popover = await this.popoverCtrl.create({
      component: RecipeDetailsPopoverPage,
      componentProps: {
        recipeId: this.recipeId,
      },
      event
    });

    await popover.present();

    const { data } = await popover.onWillDismiss();
    if (!data || !data.action) return;
    switch(data.action) {
      case 'updateWakeLock':
        const wlEnabled = this.preferencesService.preferences[RecipeDetailsPreferenceKey.EnableWakeLock];
        wlEnabled ? this.setupWakeLock() : this.releaseWakeLock();
        break;
      case 'addToShoppingList':
        this.addRecipeToShoppingList();
        break;
      case 'addToMealPlan':
        this.addRecipeToMealPlan();
        break;
      case 'share':
        this.shareRecipe();
        break;
      case 'print':
        this.printRecipe();
        break;
      case 'unpin':
        this.unpinRecipe();
        break;
      case 'pin':
        this.pinRecipe();
        break;
      case 'edit':
        this.editRecipe();
        break;
      case 'clone':
        this.cloneRecipe();
        break;
      case 'delete':
        this.deleteRecipe();
        break;
    }
  }

  instructionClicked(event, instruction: Instruction, idx: number) {
    if (instruction.isHeader) return;

    this.recipeCompletionTrackerService.toggleInstructionComplete(this.recipeId, idx);
  }

  ingredientClicked(event, ingredient: Instruction, idx: number) {
    if (ingredient.isHeader) return;

    this.recipeCompletionTrackerService.toggleIngredientComplete(this.recipeId, idx);
  }

  getInstructionComplete(idx: number) {
    return this.recipeCompletionTrackerService.getInstructionComplete(this.recipeId, idx);
  }

  getIngredientComplete(idx: number) {
    return this.recipeCompletionTrackerService.getIngredientComplete(this.recipeId, idx);
  }

  async changeScale() {
    const popover = await this.popoverCtrl.create({
      component: ScaleRecipeComponent,
      componentProps: {
        scale: this.scale.toString()
      }
    });

    await popover.present();
    const { data } = await popover.onDidDismiss();

    if (data?.scale) {
      this.scale = data.scale;
      this.recipeCompletionTrackerService.setRecipeScale(this.recipeId, this.scale);
      this.applyScale();
    }
  }

  applyScale() {
    this.ingredients = this.recipeService.parseIngredients(this.recipe.ingredients, this.scale, true);
  }

  editRecipe() {
    this.navCtrl.navigateForward(RouteMap.EditRecipePage.getPath(this.recipeId));
  }

  async deleteRecipe() {
    const header = await this.translate.get('pages.recipeDetails.delete.header').toPromise();
    const message = await this.translate.get('pages.recipeDetails.delete.message').toPromise();
    const cancel = await this.translate.get('generic.cancel').toPromise();
    const del = await this.translate.get('generic.delete').toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: 'cancel',
          handler: () => {}
        },
        {
          text: del,
          cssClass: 'alertDanger',
          handler: () => {
            this._deleteRecipe();
          }
        }
      ]
    });
    alert.present();
  }

  private async _deleteRecipe() {
    const loading = this.loadingService.start();

    const response = await this.recipeService.delete(this.recipe.id);

    loading.dismiss();
    if (!response.success) return;

    this.navCtrl.navigateRoot(RouteMap.HomePage.getPath(this.recipe.folder));
  }

  async addRecipeToShoppingList() {
    const modal = await this.modalCtrl.create({
      component: AddRecipeToShoppingListModalPage,
      componentProps: {
        recipes: [this.recipe],
        scale: this.scale
      }
    });

    modal.present();
  }

  async addRecipeToMealPlan() {
    const modal = await this.modalCtrl.create({
      component: AddRecipeToMealPlanModalPage,
      componentProps: {
        recipe: this.recipe
      }
    });

    modal.present();
  }

  async printRecipe() {
    const printRecipeModal = await this.modalCtrl.create({
      component: PrintRecipeModalPage,
      componentProps: {
        recipe: this.recipe,
        scale: this.scale
      }
    });

    printRecipeModal.present();
  }

  async shareRecipe() {
    const shareModal = await this.modalCtrl.create({
      component: ShareModalPage,
      componentProps: {
        recipe: this.recipe
      }
    });
    shareModal.present();
  }

  async moveToFolder(folderName: string) {
    const loading = this.loadingService.start();

    this.recipe.folder = folderName;

    console.log(this.recipe);

    const response = await this.recipeService.update(this.recipe);

    loading.dismiss();
    if (!response.success) return;

    this.navCtrl.navigateRoot(RouteMap.RecipePage.getPath(response.data.id)); // TODO: Check that this "refresh" works with new router
  }

  toggleAutocomplete(show, event?) {
    if (event) {
      if (event.relatedTarget && event.relatedTarget.className.indexOf('suggestion') > -1) {
        return;
      }
      if (
        event.target &&
        (event.target.id.match('labelInputField') ||
        event.target.className.match('labelInputField') ||
        event.target.className.match('suggestion'))
      ) {
        return;
      }
    }
    this.showAutocomplete = show;
  }

  async addLabel(title: string) {
    if (title.length === 0) {
      const message = await this.translate.get('pages.recipeDetails.enterLabelWarning').toPromise();
      (await this.toastCtrl.create({
        message,
        duration: 6000
      })).present();
      return;
    }

    this.pendingLabel = '';

    const loading = this.loadingService.start();

    await this.labelService.create({
      recipeId: this.recipe.id,
      title: title.toLowerCase()
    });
    this.loadAll();
    loading.dismiss();
  }

  async deleteLabel(label) {
    const header = await this.translate.get('pages.recipeDetails.deleteLabel.header').toPromise();
    const message = await this.translate.get('pages.recipeDetails.deleteLabel.message', {title: label.title}).toPromise();
    const cancel = await this.translate.get('generic.cancel').toPromise();
    const del = await this.translate.get('generic.delete').toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: 'cancel',
          handler: () => {
            // this.selectedLabels.push(label.title);
          }
        },
        {
          text: del,
          handler: () => {
            this._deleteLabel(label);
          }
        }
      ]
    });
    alert.present();
  }

  private async _deleteLabel(label) {
    const loading = this.loadingService.start();

    await this.labelService.removeFromRecipe({
      labelId: label.id,
      recipeId: this.recipe.id
    });
    await this.loadAll();
    loading.dismiss();
  }

  async cloneRecipe() {
    const loading = this.loadingService.start();
    const response = await this.recipeService.create({
      ...this.recipe,
      imageIds: this.recipe.images.map(image => image.id),
      labels: this.recipe.isOwner ? this.recipe.labels.map(label => label.title) : [],
    });

    loading.dismiss();
    if (!response.success) return;

    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(response.data.id));
  }

  async goToAuth(cb?: () => any) {
    const authModal = await this.modalCtrl.create({
      component: AuthPage,
      componentProps: {
        register: !this.isLoggedIn
      }
    });
    authModal.onDidDismiss().then(() => {
      this.updateIsLoggedIn();
      if (cb) cb();
    });
    authModal.present();
  }

  authAndClone() {
    this.goToAuth(() => {
      this.cloneRecipe().then(async () => {
        const message = await this.translate.get('pages.recipeDetails.cloned').toPromise();
        (await this.toastCtrl.create({
          message,
          duration: 5000
        })).present();
      });
    });
  }

  prettyDateTime(datetime) {
    if (!datetime) return '';
    return this.utilService.formatDate(datetime, { times: true });
  }

  async openImageViewer() {
    const imageViewerModal = await this.modalCtrl.create({
      component: ImageViewerComponent,
      componentProps: {
        imageUrls: this.recipe.images.map(image => image.location)
      }
    });
    imageViewerModal.present();
  }

  pinRecipe() {
    this.cookingToolbarService.pinRecipe({
      id: this.recipe.id,
      title: this.recipe.title,
      imageUrl: this.recipe.images?.[0]?.location
    });
  }

  unpinRecipe() {
    this.cookingToolbarService.unpinRecipe(this.recipe.id);
  }

  setupWakeLock() {
    if (!this.wakeLockRequest && this.preferencesService.preferences[RecipeDetailsPreferenceKey.EnableWakeLock]) {
      this.wakeLockService.request().then(wl => this.wakeLockRequest = wl);
    }
  }

  releaseWakeLock() {
    if (this.wakeLockRequest) this.wakeLockRequest.release();
    this.wakeLockRequest = null;
  }
}
