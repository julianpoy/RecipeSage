import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, ToastController } from 'ionic-angular';

import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { ShoppingListServiceProvider } from '../../../providers/shopping-list-service/shopping-list-service';
import { MessagingServiceProvider } from '../../../providers/messaging-service/messaging-service';
import { UserServiceProvider } from '../../../providers/user-service/user-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-new-shopping-list-modal',
  templateUrl: 'new-shopping-list-modal.html',
})
export class NewShoppingListModalPage {

  listTitle: string = '';

  threadsByUserId: any = {};
  existingThreads: any = [];
  selectedThreads: any = [];
  pendingThread: string = '';
  showAutocomplete: boolean = false;
  autocompleteSelectionIdx: number = -1;

  // Holds user autocomplete variables
  pendingCollaboratorName: any = '';
  pendingCollaboratorId: any = '';
  searchingForRecipient: boolean = false;
  autofillTimeout: any;

  constructor(
    public navCtrl: NavController,
    public viewCtrl: ViewController,
    public loadingService: LoadingServiceProvider,
    public shoppingListService: ShoppingListServiceProvider,
    public messagingService: MessagingServiceProvider,
    public userService: UserServiceProvider,
    public toastCtrl: ToastController,
    public navParams: NavParams) {

    this.loadThreads().then(function () { }, function () { });
  }

  ionViewDidLoad() {}

  loadThreads() {
    var me = this;

    return new Promise(function (resolve, reject) {
      me.messagingService.threads().subscribe(function (response) {
        me.existingThreads = response.map(function(el){
          me.threadsByUserId[el.otherUser._id] = el.otherUser;
          console.log(el.otherUser)
          return el.otherUser;
          // return el.otherUser._id;
        });

        resolve();
      }, function (err) {
        reject();

        switch (err.status) {
          case 0:
            let offlineToast = me.toastCtrl.create({
              message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
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

  autofillUserName(callback) {
    this.searchingForRecipient = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);

    var me = this;
    this.autofillTimeout = setTimeout(function () {
      me.userService.getUserByEmail(me.pendingThread.trim()).subscribe(function (response) {
        if (!me.threadsByUserId[response._id]) {
          me.existingThreads.push(response);
          me.threadsByUserId[response._id] = response;
        }

        me.pendingCollaboratorName = response.name || response.email;
        me.pendingCollaboratorId = response._id;
        me.searchingForRecipient = false;

        if (callback) callback.call(null);
      }, function (err) {
        me.pendingCollaboratorName = '';
        me.pendingCollaboratorId = '';
        me.searchingForRecipient = false;

        if (callback) callback.call(null);
      });
    }, 500);
  }

  toggleAutocomplete(show, event?) {
    if (event && event.relatedTarget) {
      if (event.relatedTarget.className.indexOf('suggestion') > -1) {
        return;
      }
    }
    this.showAutocomplete = show;
    this.autocompleteSelectionIdx = -1;
  }

  labelFieldKeyUp(event) {
    // Only listen for up or down arrow
    if (event.keyCode !== 38 && event.keyCode !== 40) return;

    // Get all suggestions (including click to create)
    var suggestions = document.getElementsByClassName('autocomplete')[0].children;

    // If result list size was reduced, do not overflow
    if (this.autocompleteSelectionIdx > suggestions.length - 1) this.autocompleteSelectionIdx = suggestions.length - 1;

    if (event.keyCode === 40 && this.autocompleteSelectionIdx < suggestions.length - 1) {
      // Arrow Down
      this.autocompleteSelectionIdx++;
    } else if (event.keyCode === 38 && this.autocompleteSelectionIdx >= 0) {
      // Arrow Up
      this.autocompleteSelectionIdx--;
    }

    if (this.autocompleteSelectionIdx === -1) {
      (document.getElementById('labelInputField') as HTMLElement).focus();
    } else {
      (suggestions[this.autocompleteSelectionIdx] as HTMLElement).focus();
    }
  }

  onAddCollaboratorEnter($event) {
    var me = this;

    this.autofillUserName(function() {
      if (me.pendingCollaboratorId) {
        $event.target.value = '';

        me.addCollaborator(me.pendingCollaboratorId);
      } else {
        me.toastCtrl.create({
          message: 'Could not find user with that email address.',
          duration: 6000
        }).present();
      }
    });
  }

  addCollaborator(userId) {
    if (userId.length === 0) {
      this.toastCtrl.create({
        message: 'Please enter a valid email and press enter.',
        duration: 6000
      }).present();
      return;
    }

    this.selectedThreads.push(userId);

    this.toggleAutocomplete(false);

    this.pendingThread = '';
  }

  removeCollaborator(userId) {
    this.selectedThreads.splice(this.selectedThreads.indexOf(userId), 1);
  }

  save() {
    var me = this;

    var loading = this.loadingService.start();

    this.shoppingListService.create({
      title: this.listTitle,
      collaborators: this.selectedThreads
    }).subscribe(function (response) {
      loading.dismiss();
      me.viewCtrl.dismiss({
        destination: 'ShoppingListPage',
        routingData: {
          shoppingListId: response._id
        },
        setRoot: false
      });
    }, function (err) {
      loading.dismiss();
      switch (err.status) {
        case 0:
          let offlineToast = me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
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

  cancel() {
    this.viewCtrl.dismiss({
      destination: false
    });
  }
}
