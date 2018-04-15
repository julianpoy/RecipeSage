import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController } from 'ionic-angular';

import { UserServiceProvider } from '../../providers/user-service/user-service';
import { MessagingServiceProvider } from '../../providers/messaging-service/messaging-service';

@IonicPage({
  priority: 'low'
})
@Component({
  selector: 'page-new-message-modal',
  templateUrl: 'new-message-modal.html',
})
export class NewMessageModalPage {

  searching: boolean = false;
  autofillTimeout: any;
  
  recipientEmail: string = '';
  recipientName: string = '';
  recipientId: string = '';
  
  message: string = '';

  constructor(
    public navCtrl: NavController,
    public navParams: NavParams,
    public toastCtrl: ToastController,
    public userService: UserServiceProvider,
    public messagingService: MessagingServiceProvider) {
  }

  ionViewDidLoad() {
    console.log('ionViewDidLoad NewMessageModalPage');
  }
  
  autofillUserName() {
    this.searching = true;

    if (this.autofillTimeout) clearTimeout(this.autofillTimeout);
    
    var me = this;
    this.autofillTimeout = setTimeout(function() {
      me.userService.getUserByEmail(me.recipientEmail.trim()).subscribe(function(response) {
        me.recipientName = response.name || response.email;
        me.searching = false;
        me.recipientId = response._id;
      }, function(err) {
        me.recipientName = '';
        me.recipientId = '';
        me.searching = false;
      });
    }, 500);
  }
  
  send() {
    var me = this;
    this.message = this.message || 'Hello! I\'d like to chat on RecipeSage';
    
    this.messagingService.create({
      to: this.recipientId,
      body: this.message
    }).subscribe(function(response) {
      me.navCtrl.setRoot('MessageThreadPage', {
        otherUserId: me.recipientId
      }, {animate: true, direction: 'forward'});
    }, function(err) {
      switch(err.status) {
        case 401:
          me.navCtrl.setRoot('LoginPage', {}, {animate: true, direction: 'forward'});
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'An unexpected error occured. Please restart application.',
            duration: 30000
          });
          errorToast.present();
          break;
      }
    })
  }

  cancel() {
    this.navCtrl.pop();
  }
}
