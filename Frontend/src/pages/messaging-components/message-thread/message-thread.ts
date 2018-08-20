import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, Events } from 'ionic-angular';

import { MessagingServiceProvider } from '../../../providers/messaging-service/messaging-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';

@IonicPage({
  segment: 'messages/:otherUserId',
  priority: 'low'
})
@Component({
  selector: 'page-message-thread',
  templateUrl: 'message-thread.html',
})
export class MessageThreadPage {

  @ViewChild('content') content: any;

  messages: any = [];

  otherUserId: string = '';
  pendingMessage: string = '';
  messagePlaceholder: string = 'Message...';
  reloading: boolean = false;

  isViewLoaded: boolean = true;

  constructor(
    private changeDetector: ChangeDetectorRef,
    public navCtrl: NavController,
    public navParams: NavParams,
    public events: Events,
    public toastCtrl: ToastController,
    public loadingService: LoadingServiceProvider,
    public messagingService: MessagingServiceProvider) {
    this.otherUserId = this.navParams.get('otherUserId');

    var me = this;
    events.subscribe('messages:new', (message) => {
      if (!me.isViewLoaded || message.otherUser._id !== me.otherUserId) return;

      me.loadMessages.call(me).then(function() {}, function() {});
    });

    events.subscribe('application:multitasking:resumed', () => {
      if (!me.isViewLoaded) return;

      me.loadMessages.call(me).then(function() {
        me.changeDetector.detectChanges();
      }, function() {});
    });
  }

  ionViewDidLoad() {}

  ionViewWillEnter() {
    this.isViewLoaded = true;
    this.otherUserId = this.navParams.get('otherUserId');

    if (!this.otherUserId) {
      this.navCtrl.setRoot('MessagesPage', {}, {animate: true, direction: 'forward'});
    } else {
      var loading = this.loadingService.start();
      var me = this;
      this.content.getNativeElement().style.opacity = 0;
      this.loadMessages.call(this, true).then(function() {
        loading.dismiss();
        me.content.getNativeElement().style.opacity = 1;
      }, function() {
        loading.dismiss();
      });
    }
  }

  ionViewWillLeave() {
    this.isViewLoaded = false;
  }

  reload() {
    this.reloading = true;

    var me = this;
    this.loadMessages.call(this).then(function() {
      me.reloading = false;
    }, function() {
      me.reloading = false;
    });
  }

  refresh(refresher) {
    this.loadMessages.call(this).then(function() {
      refresher.complete();
    }, function() {
      refresher.complete();
    });
  }

  scrollToBottom(animate?, delay?, callback?) {
    var animationDuration = animate ? 300 : 0;
    var me = this;
    if (delay) {
      setTimeout(function() {
        me.content.scrollToBottom(animationDuration);
        if (callback) {
          callback.call(me);
        }
      });
    } else {
      this.content.scrollToBottom(animationDuration);
    }
  }

  keyboardOpened() {
    var me = this;
    window.onresize = function() {
      me.scrollToBottom.call(me, false, true);
      window.onresize = null;
    }
  }

  trackByFn(index, item) {
    return item._id;
  }

  loadMessages(isInitialLoad?) {
    var me = this;

    return new Promise(function(resolve, reject) {
      me.messagingService.fetch(me.otherUserId).subscribe(function(response) {
        me.messages = response;

        me.scrollToBottom.call(me, !isInitialLoad, true, function() {
          resolve();
        });
      }, function(err) {
        reject();

        if (!me.isViewLoaded) return;
        switch(err.status) {
          default:
            me.navCtrl.setRoot('MessagesPage', {}, {animate: true, direction: 'forward'});
            break;
        }
      });
    });
  }

  sendMessage() {
    var me = this;
    if (!this.pendingMessage) return;

    var myMessage = this.pendingMessage;
    this.pendingMessage = '';
    this.messagePlaceholder = 'Sending...';

    this.messagingService.create({
      to: this.otherUserId,
      body: myMessage
    }).subscribe(function(response) {
      me.messagePlaceholder = 'Message...';

      me.messages.push(response);

      me.scrollToBottom.call(me, true, true);
    }, function(err) {
      me.messagePlaceholder = 'Message...';
      me.pendingMessage = myMessage;
      switch(err.status) {
        case 0:
          let offlineToast = me.toastCtrl.create({
            message: 'It looks like you\'re offline. While offline, all RecipeSage functions are read-only.',
            duration: 5000
          });
          offlineToast.present();
          break;
        default:
          let errorToast = me.toastCtrl.create({
            message: 'Failed to send message.',
            duration: 5000
          });
          errorToast.present();
          break;
      }
    });
  }

  openRecipe(recipe) {
    this.navCtrl.push('RecipePage', {
      recipe: recipe,
      recipeId: recipe._id
    });
  }

  onMessageKeyUp(event) {
    if ((event.keyCode == 10 || event.keyCode == 13) && event.ctrlKey) {
      this.sendMessage();
    }
  }

  parseMessage(message) {
    var updated = message;

    updated = (<any>window).linkifyStr(updated, {
      target: {
        url: '_blank'
      },
      className: 'linkified'
    });

    return updated;
  }
}
