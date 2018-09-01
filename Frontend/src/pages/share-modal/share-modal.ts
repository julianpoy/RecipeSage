import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, ToastController } from 'ionic-angular';

import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';
import { UserServiceProvider } from '../../providers/user-service/user-service';
import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';
import { LoadingServiceProvider } from '../../providers/loading-service/loading-service';
import { UtilServiceProvider } from '../../providers/util-service/util-service';

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

    this.loadThreads().then(function() {}, function() {});
  }

  ionViewDidLoad() {}

  cancel() {
    this.viewCtrl.dismiss({
      destination: false
    });
  }

  loadThreads() {
    var me = this;

    return new Promise(function(resolve, reject) {
      me.messagingService.threads().subscribe(function(response) {
        me.threads = response;

        resolve();
      }, function(err) {
        reject();

        switch(err.status) {
          case 0:
            let offlineToast = me.toastCtrl.create({
              message: me.utilService.standardMessages.offlinePushMessage,
              duration: 5000
            });
            offlineToast.present();
            break;
          case 401:
            me.viewCtrl.dismiss({
              destination: 'LoginPage',
              setRoot: true
            });
            break;
          default:
            let errorToast = me.toastCtrl.create({
              message: 'An unexpected error occured. Please restart application.',
              duration: 30000
            });
            errorToast.present();
            break;
        }
      });
    });
  }

  selectRecipient(thread) {
    this.recipientId = thread.otherUser._id;
    console.log(this.recipientId)
    this.recipientName = '';
    this.recipientEmail = '';
  }

  autofillUserName() {
    this.searchingForRecipient = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);

    var me = this;
    this.autofillTimeout = setTimeout(function() {
      me.userService.getUserByEmail(me.recipientEmail.trim()).subscribe(function(response) {
        me.recipientName = response.name || response.email;
        me.recipientId = response._id;
        me.selectedThread = null;
        me.searchingForRecipient = false;
      }, function(err) {
        me.recipientName = '';
        me.recipientId = '';
        me.selectedThread = null;
        me.searchingForRecipient = false;
      });
    }, 500);
  }

  send() {
    var me = this;

    var loading = this.loadingService.start();

    this.messagingService.create({
      to: this.recipientId,
      body: '',
      recipeId: this.recipe._id
    }).subscribe(function(response) {
      loading.dismiss();
      me.viewCtrl.dismiss({
        destination: 'MessageThreadPage',
        routingData: {
          otherUserId: me.recipientId
        },
        setRoot: false
      });
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 0:
          let offlineToast = me.toastCtrl.create({
            message: me.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        case 401:
          me.viewCtrl.dismiss({
            destination: 'LoginPage',
            setRoot: true
          });
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please restart application.',
            duration: 30000
          });
          errorToast.present();
          break;
      }
    });
  }
}
