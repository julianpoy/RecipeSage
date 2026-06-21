import { Component, Input, inject } from "@angular/core";
import {
  NavController,
  ModalController,
  ToastController,
} from "@ionic/angular/standalone";

import { ServerActionsService } from "../../services/server-actions.service";
import type { UserPublic, RecipeSummary } from "@recipesage/prisma";
import { LoadingService } from "../../services/loading.service";
import {
  UtilService,
  RecipeTemplateModifiers,
  RouteMap,
} from "../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../providers/shared-ui.provider";
import { SelectUserKnownUserComponent } from "../../components/select-user-knownuser/select-user-knownuser.component";
import { CopyWithWebshareComponent } from "../../components/copy-with-webshare/copy-with-webshare.component";
import { RecipePreviewComponent } from "../../components/recipe-preview/recipe-preview.component";
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonToggle,
  IonInput,
  IonFooter,
  type SegmentCustomEvent,
} from "@ionic/angular/standalone";
import {
  close,
  codeWorking,
  documentText,
  image,
  link,
  print,
  resize,
  send,
  swapHorizontal,
} from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-share-modal",
  templateUrl: "share-modal.page.html",
  styleUrls: ["share-modal.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    SelectUserKnownUserComponent,
    CopyWithWebshareComponent,
    RecipePreviewComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonAvatar,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonToggle,
    IonInput,
    IonFooter,
  ],
})
export class ShareModalPage {
  navCtrl = inject(NavController);
  toastCtrl = inject(ToastController);
  utilService = inject(UtilService);
  loadingService = inject(LoadingService);
  serverActionsService = inject(ServerActionsService);
  modalCtrl = inject(ModalController);

  @Input({
    required: true,
  })
  recipe!: RecipeSummary;

  selectedUser?: UserPublic;
  recipientId?: string;

  shareMethod = "account";

  recipeURL?: string;

  enableJSONLD = true;
  embedHeight = 800;
  embedWidth = 600;
  embedConfig: RecipeTemplateModifiers = {
    verticalInstrIng: false,
    titleImage: true,
    hideNotes: false,
    hideSource: false,
    hideSourceURL: false,
    showPrintButton: true,
  };
  recipePreviewURL?: string;
  recipeEmbedURL?: string;
  recipeEmbedCode?: string;

  constructor() {
    addIcons({
      close,
      codeWorking,
      documentText,
      image,
      link,
      print,
      resize,
      send,
      swapHorizontal,
    });
    setTimeout(() => {
      this.recipeURL =
        `${window.location.protocol}//${window.location.host}` +
        `/api/share/recipe/${this.recipe.id}`;

      this.updateEmbed(true);
    });
  }

  cancel() {
    this.modalCtrl.dismiss();
  }

  updateEmbed(updateURL?: boolean) {
    if (updateURL) {
      this.recipeEmbedURL = this.utilService.generateRecipeTemplateURL(
        this.recipe.id,
        this.embedConfig,
      );
      this.recipePreviewURL = this.recipeEmbedURL;
    }

    const jsonLDCode = `<script>
      fetch('${this.utilService.getBase()}recipes/${this.recipe.id}/json-ld')
      .then(response => response.text())
      .then(structuredDataText => {
        const script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.textContent = structuredDataText;
        document.head.appendChild(script);
      });
    </script>`;

    const iframeCode = `<iframe
      style="box-shadow: 1px 1px 14px rgb(100,100,100); border: none; height: ${this.embedHeight}px; width: ${this.embedWidth}px;"
      src="${this.recipeEmbedURL}"
      scrolling="auto"
      frameborder="0"></iframe>`;

    let embedCode = "";
    if (this.enableJSONLD) embedCode += `${jsonLDCode}\n`;
    embedCode += iframeCode;

    this.recipeEmbedCode = embedCode;
  }

  selectUser(user: UserPublic | undefined) {
    if (!user) {
      this.selectedUser = undefined;
      this.recipientId = undefined;
      return;
    }

    this.selectedUser = user;
    this.recipientId = user.id;
  }

  async send() {
    if (!this.recipientId) return;

    const loading = this.loadingService.start();

    const response = await this.serverActionsService.messages.createMessage({
      to: this.recipientId,
      body: "",
      recipeId: this.recipe.id,
    });
    loading.dismiss();
    if (!response) return;

    this.modalCtrl.dismiss();
    this.navCtrl.navigateForward(
      RouteMap.MessageThreadPage.getPath(this.recipientId),
    );
  }

  shareMethodChanged(event: SegmentCustomEvent) {
    this.shareMethod = String(event.detail.value);
  }
}
