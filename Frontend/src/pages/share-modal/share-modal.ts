import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, ToastController, LoadingController } from 'ionic-angular';

import { UserServiceProvider } from '../../providers/user-service/user-service';
import { RecipeServiceProvider, Recipe } from '../../providers/recipe-service/recipe-service';

@IonicPage()
@Component({
  selector: 'page-share-modal',
  templateUrl: 'share-modal.html',
})
export class ShareModalPage {
  
  recipe: Recipe;
  
  destinationUserEmail: string = '';
  destinationUserName: string = '';
  searchingForDestinationUser: boolean = false;
  
  recents: any[] = [];
  
  autofillTimeout: any;

  constructor(
  public navCtrl: NavController,
  public navParams: NavParams,
  public toastCtrl: ToastController,
  public loadingCtrl: LoadingController,
  public recipeService: RecipeServiceProvider,
  public userService: UserServiceProvider,
  public viewCtrl: ViewController) {
    this.recipe = navParams.get('recipe');
    
    this.loadRecents();
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad ShareModalPage');
  }
  
  cancel() {
    this.viewCtrl.dismiss();
  }
  
  removeRecent(email) {
    if (this.recents.indexOf(email) > -1) {
      this.recents.splice(this.recents.indexOf(email), 1);
      
      localStorage.setItem('recents', JSON.stringify(this.recents));
    }
  }
  
  loadRecents() {
    if (!localStorage.getItem('recents')) {
      return;
    }
    
    var me = this;
    
    var recentContactsRaw = JSON.parse(localStorage.getItem('recents'));

    var recentContacts = [];

    var promises = [];
    
    for (var i = 0; i < recentContactsRaw.length; i++) {
      let raw = recentContactsRaw[i];
      promises.push(new Promise(function(resolve, reject) {
        me.userService.getUserByEmail(raw.email).subscribe(function(response) {
          recentContacts.push({
            name: response.name,
            email: response.email
          });
          resolve();
        }, function(err) {
          recentContacts.push({
            name: raw.name,
            email: raw.email
          });
          resolve();
        });
      }));
    }
    
    Promise.all(promises).then(function() {
      me.recents = recentContacts;
    }, function() {});
  }
  
  autofillUserName() {
    this.searchingForDestinationUser = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);
    
    var me = this;
    this.autofillTimeout = setTimeout(function() {
      me.userService.getUserByEmail(me.destinationUserEmail.trim()).subscribe(function(response) {
        me.destinationUserName = response.name || response.email;
        me.searchingForDestinationUser = false;
      }, function(err) {
        me.destinationUserName = '';
        me.searchingForDestinationUser = false;
      });
    }, 500);
  }
  
  send() {
    this.destinationUserEmail = this.destinationUserEmail.trim();

    var emailRegex = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:[A-Z]{2}|com|org|net|edu|gov|mil|biz|info|mobi|name|aero|asia|jobs|museum)\b/;
    if (this.destinationUserEmail.length === 0) {
      let errorToast = this.toastCtrl.create({
        message: 'Please enter the email address of the user you\'d like to send this recipe to.',
        duration: 6000
      });
      errorToast.present();
      return;
    } else if (!emailRegex.test(this.destinationUserEmail)) {
      let errorToast = this.toastCtrl.create({
        message: 'Please enter a valid email address.',
        duration: 6000
      });
      errorToast.present();
      return;
    }
    
    var me = this;
    
    let loading = this.loadingCtrl.create({
      content: 'Sending recipe...',
      dismissOnPageChange: true
    });
  
    loading.present();
    
    this.destinationUserEmail = this.destinationUserEmail.trim().toLowerCase();
    this.recipe.destinationUserEmail = this.destinationUserEmail;
    
    this.recipeService.share(this.recipe).subscribe(function(response) {
      var recentExists = false;
      for (var i = 0; i < me.recents.length; i++) {
        if (me.recents[i].email === me.destinationUserEmail) {
          recentExists = true;
          break;
        }
      }
      if (!recentExists) {
        me.recents.push({
          name: me.destinationUserName,
          email: me.destinationUserEmail
        });

        localStorage.setItem('recents', JSON.stringify(me.recents));
      }
      
      loading.dismiss();

      me.cancel();
      
      me.toastCtrl.create({
        message: 'Successfully sent recipe to recipient.',
        duration: 6000
      }).present();
    }, function(err) {
      loading.dismiss();
      switch(err.status) {
        case 401:
          me.toastCtrl.create({
            message: 'You are not authorized for this action! If you believe this is in error, please logout and login using the side menu.',
            duration: 6000
          }).present();
          break;
        case 404:
          me.toastCtrl.create({
            message: 'I couldn\'t find a Recipe Sage user with that email address.',
            duration: 6000
          }).present();
          break;
        default:
          me.toastCtrl.create({
            message: 'An unexpected error occured. Please try again.',
            duration: 6000
          }).present();
          break;
      }
    });
  }

}
