import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, ToastController } from 'ionic-angular';

import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';
import { UserServiceProvider } from '../../providers/user-service/user-service';
import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';
import { LoadingServiceProvider } from '../../providers/loading-service/loading-service';
import { UtilServiceProvider, RecipeTemplateModifiers } from '../../providers/util-service/util-service';
import { SafeResourceUrl } from '@angular/platform-browser';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-share-modal',
  templateUrl: 'share-modal.html',
})
export class ShareModalPage {

  recipe: Recipe;

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
  public navParams: NavParams,
  public toastCtrl: ToastController,
  public utilService: UtilServiceProvider,
  public loadingService: LoadingServiceProvider,
  public messagingService: MessagingServiceProvider,
  public recipeService: RecipeServiceProvider,
  public userService: UserServiceProvider,
  public viewCtrl: ViewController) {
    this.recipe = navParams.get('recipe');

    this.recipeURL = `${window.location.protocol}//${window.location.host}/#/recipe/${this.recipe.id}?usp=sharing&v=${(window as any).version}`;

    this.loadThreads().then(() => {}, () => {});

    this.updateEmbed(true);
  }

  ionViewDidLoad() {}

  cancel() {
    this.viewCtrl.dismiss({
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
      this.messagingService.threads().subscribe(response => {
        this.threads = response;

        resolve();
      }, err => {
        reject();

        switch(err.status) {
          case 0:
            let offlineToast = this.toastCtrl.create({
              message: this.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            this.viewCtrl.dismiss({
              destination: 'LoginPage',
              setRoot: true
            });
            break;
          default:
            let errorToast = this.toastCtrl.create({
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
      this.userService.getUserByEmail(this.recipientEmail.trim()).subscribe(response => {
        this.recipientName = response.name || response.email;
        this.recipientId = response.id;
        this.selectedThread = null;
        this.searchingForRecipient = false;
      }, err => {
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
    }).subscribe(response => {
      loading.dismiss();
      this.viewCtrl.dismiss({
        destination: 'MessageThreadPage',
        routingData: {
          otherUserId: this.recipientId
        },
        setRoot: false
      });
    }, err => {
      loading.dismiss();
      switch(err.status) {
        case 0:
          let offlineToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          this.viewCtrl.dismiss({
            destination: 'LoginPage',
            setRoot: true
          });
          break;
        default:
          let errorToast = this.toastCtrl.create({
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
