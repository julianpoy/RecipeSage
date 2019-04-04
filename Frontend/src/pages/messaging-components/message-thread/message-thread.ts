import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { IonicPage, NavController, NavParams, ToastController, Events } from 'ionic-angular';

import * as linkifyStr from 'linkifyjs/string';

import { MessagingServiceProvider } from '../../../providers/messaging-service/messaging-service';
import { LoadingServiceProvider } from '../../../providers/loading-service/loading-service';
import { WebsocketServiceProvider } from '../../../providers/websocket-service/websocket-service';
import { UtilServiceProvider } from '../../../providers/util-service/util-service';

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
  messagesById: any = {};

  otherUserId: string = '';
  pendingMessage: string = '';
  messagePlaceholder: string = 'Message...';
  reloading: boolean = false;

  isViewLoaded: boolean = true;

  selectedChatIdx: number = -1;

  constructor(
    private changeDetector: ChangeDetectorRef,
    public navCtrl: NavController,
    public navParams: NavParams,
    public events: Events,
    public toastCtrl: ToastController,
    public loadingService: LoadingServiceProvider,
    public websocketService: WebsocketServiceProvider,
    public utilService: UtilServiceProvider,
    public messagingService: MessagingServiceProvider) {
    this.otherUserId = this.navParams.get('otherUserId');

    this.websocketService.register('messages:new', payload => {
      if (!this.isViewLoaded || payload.otherUser.id !== this.otherUserId) return;

      this.loadMessages().then(() => { }, () => { });
    }, this);

    events.subscribe('application:multitasking:resumed', () => {
      if (!this.isViewLoaded) return;

      this.loadMessages().then(() => {
        this.changeDetector.detectChanges();
      }, () => {});
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

      this.content.getNativeElement().style.opacity = 0;
      this.loadMessages(true).then(() => {
        loading.dismiss();
        this.content.getNativeElement().style.opacity = 1;
      }, () => {
        loading.dismiss();
      });
    }
  }

  ionViewWillLeave() {
    this.isViewLoaded = false;
  }

  reload() {
    this.reloading = true;

    this.loadMessages().then(() => {
      this.reloading = false;
    }, () => {
      this.reloading = false;
    });
  }

  refresh(refresher) {
    this.loadMessages().then(() => {
      refresher.complete();
    }, () => {
      refresher.complete();
    });
  }

  scrollToBottom(animate?, delay?, callback?) {
    var animationDuration = animate ? 300 : 0;

    if (delay) {
      setTimeout(() => {
        this.content.scrollToBottom(animationDuration);
        if (callback) {
          callback.call(this);
        }
      });
    } else {
      this.content.scrollToBottom(animationDuration);
    }
  }

  keyboardOpened() {
    window.onresize = () => {
      this.scrollToBottom.call(this, false, true);
      window.onresize = null;
    }
  }

  trackByFn(index, item) {
    return item.id;
  }

  loadMessages(isInitialLoad?) {
    return new Promise((resolve, reject) => {
      this.messagingService.fetch(this.otherUserId).subscribe(response => {
        this.messages = response.map(message => {
          // Reuse messages that have already been parsed for performance. Otherwise, send it through linkify
          if (this.messagesById[message.id]) {
            message.body = this.messagesById[message.id].body;
          } else {
            message.body = this.parseMessage(message.body);
          }

          this.messagesById[message.id] = message;

          return message;
        });

        this.processMessages();

        this.scrollToBottom.call(this, !isInitialLoad, true, () => {
          resolve();
        });
      }, err => {
        reject();

        if (!this.isViewLoaded) return;
        switch(err.status) {
          default:
            this.navCtrl.setRoot('MessagesPage', {}, {animate: true, direction: 'forward'});
            break;
        }
      });
    });
  }

  processMessages() {
    for (var i = 0; i < this.messages.length; i++) {
      let message = this.messages[i];
      message.deservesDateDiff = !!this.deservesDateDiff(this.messages[i-1], message);
      if (message.deservesDateDiff) message.dateDiff = this.formatMessageDividerDate(message.createdAt);
      message.formattedDate = this.formatMessageDate(message.createdAt);
    }
  }

  sendMessage() {
    if (!this.pendingMessage) return;

    var myMessage = this.pendingMessage;
    this.pendingMessage = '';
    this.messagePlaceholder = 'Sending...';

    this.messagingService.create({
      to: this.otherUserId,
      body: myMessage
    }).subscribe(response => {
      this.messagePlaceholder = 'Sent!';

      setTimeout(() => {
        this.messagePlaceholder = 'Message...';
      }, 1000);

      this.messages.push(response);

      this.processMessages();

      this.scrollToBottom(true, true);
    }, err => {
      this.messagePlaceholder = 'Message...';
      this.pendingMessage = myMessage;
      switch(err.status) {
        case 0:
          let offlineToast = this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        default:
          let errorToast = this.toastCtrl.create({
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
      recipeId: recipe.id
    });
  }

  onMessageKeyUp(event) {
    if (!(event.keyCode == 10 || event.keyCode == 13)) return;

    if (event.ctrlKey || event.shiftKey || event.altKey) {
      this.pendingMessage += "\n";
    } else {
      this.sendMessage();
    }
  }

  deservesDateDiff(previous, next) {
    if (!previous || !next) return;

    var p = new Date(previous.createdAt);
    var n = new Date(next.createdAt);

    return p.getDay() !== n.getDay();
  }

  formatMessageDividerDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate);
  }

  formatMessageDate(plainTextDate) {
    return this.utilService.formatDate(plainTextDate, { now: true, times: true });
  }

  setSelectedChat(idx) {
    if (idx === this.selectedChatIdx) {
      this.selectedChatIdx = -1;
    } else {
      this.selectedChatIdx = idx;
    }
  }

  parseMessage(message) {
    let updated = message;

    updated = linkifyStr(updated, {
      target: {
        url: '_blank'
      },
      className: 'linkified'
    });

    return updated;
  }
}
