import { Component, Input } from '@angular/core';
import { NavController, ModalController, ToastController } from '@ionic/angular';

import { MessagingService } from '@/services/messaging.service';
import { UserService } from '@/services/user.service';
import { RecipeService, Recipe } from '@/services/recipe.service';
import { LoadingService } from '@/services/loading.service';
import { UtilService, RecipeTemplateModifiers } from '@/services/util.service';
import { SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'page-share-modal',
  templateUrl: 'share-modal.page.html',
  styleUrls: ['share-modal.page.scss']
})
export class ShareModalPage {

  @Input() recipe: Recipe;

  selectedThread: any;
  recipientEmail: string = '';
  recipientName: string = '';
  recipientId: string = '';
  searchingForRecipient: boolean = false;

  threads: any = [];

  autofillTimeout: any;
  shareMethod: string = "account";

  hasCopyAPI: boolean = !!document.execCommand;
  hasWebShareAPI: boolean = !!(navigator as any).share;
  recipeURL: string;

  embedHeight: number = 800;
  embedWidth: number = 600;
  embedConfig: RecipeTemplateModifiers = {
    verticalInstrIng: false,
    titleImage: true,
    hideNotes: false,
    hideSource: false,
    hideSourceURL: false,
    showPrintButton: true
  };
  recipePreviewURL: SafeResourceUrl;
  recipeEmbedURL: string;
  recipeEmbedCode: string;

  constructor(
  public navCtrl: NavController,
  public toastCtrl: ToastController,
  public utilService: UtilService,
  public loadingService: LoadingService,
  public messagingService: MessagingService,
  public recipeService: RecipeService,
  public userService: UserService,
  public modalCtrl: ModalController) {
    this.recipeURL = `${window.location.protocol}//${window.location.host}/#/recipe/${this.recipe.id}?version=${(window as any).version}&usp=sharing`;

    this.loadThreads().then(() => {}, () => {});

    this.updateEmbed(true);
  }


  cancel() {
    this.modalCtrl.dismiss({
      destination: false
    });
  }

  updateEmbed(updateURL?: boolean) {
    if (updateURL) {
      this.recipePreviewURL = this.utilService.generateTrustedRecipeTemplateURL(this.recipe.id, this.embedConfig);
      this.recipeEmbedURL = this.utilService.generateRecipeTemplateURL(this.recipe.id, this.embedConfig);
    }

    this.recipeEmbedCode = `<iframe
      style="box-shadow: 1px 1px 14px rgb(100,100,100); border: none; height: ${this.embedHeight}px; width: ${this.embedWidth}px;"
      src="${this.recipeEmbedURL}"
      scrolling="auto"
      frameborder="0"></iframe>`;
  }

  loadThreads() {
    return new Promise((resolve, reject) => {
      this.messagingService.threads().then(response => {
        this.threads = response;

        resolve();
      }).catch(async err => {
        reject();

        switch(err.status) {
          case 0:
            let offlineToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.modalCtrl.dismiss({
              destination: 'LoginPage',
              setRoot: true
            });
            break;
          default:
            let errorToast = await this.toastCtrl.create({
              message: this.utilService.standardMessages.unexpectedError,
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  selectRecipient(thread) {
    this.recipientId = thread.otherUser.id;
    console.log(this.recipientId)
    this.recipientName = '';
    this.recipientEmail = '';
  }

  autofillUserName() {
    this.searchingForRecipient = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);

    this.autofillTimeout = setTimeout(() => {
      this.userService.getUserByEmail(this.recipientEmail.trim()).then(response => {
        this.recipientName = response.name || response.email;
        this.recipientId = response.id;
        this.selectedThread = null;
        this.searchingForRecipient = false;
      }).catch(err => {
        this.recipientName = '';
        this.recipientId = '';
        this.selectedThread = null;
        this.searchingForRecipient = false;
      });
    }, 500);
  }

  send() {
    var loading = this.loadingService.start();

    this.messagingService.create({
      to: this.recipientId,
      body: '',
      recipeId: this.recipe.id
    }).then(response => {
      loading.dismiss();
      this.modalCtrl.dismiss({
        destination: 'MessageThreadPage',
        routingData: {
          otherUserId: this.recipientId
        },
        setRoot: false
      });
    }).catch(async err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          let offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.modalCtrl.dismiss({
            destination: 'LoginPage',
            setRoot: true
          });
          break;
        default:
          let errorToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.unexpectedError,
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }

  webShare() {
    if (this.hasWebShareAPI) {
      (navigator as any).share({
        title: this.recipe.title,
        text: `${this.recipe.title}:`,
        url: this.recipeURL,
      }).then(() => this.cancel());
    }
  }

  copyCodeToClipboard() {
    var copyText = document.getElementById('codeBlockCopy') as any;

    copyText.select();

    document.execCommand("copy");
  }
}
