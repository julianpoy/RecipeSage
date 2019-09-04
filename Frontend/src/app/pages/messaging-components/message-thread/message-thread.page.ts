import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, ToastController, Events } from '@ionic/angular';

import * as linkifyStr from 'linkifyjs/string';

import { MessagingService } from '@/services/messaging.service';
import { LoadingService } from '@/services/loading.service';
import { WebsocketService } from '@/services/websocket.service';
import { UtilService, RouteMap } from '@/services/util.service';

@Component({
  selector: 'page-message-thread',
  templateUrl: 'message-thread.page.html',
  styleUrls: ['message-thread.page.scss']
})
export class MessageThreadPage {
  defaultBackHref: string = RouteMap.MessagesPage.getPath();

  @ViewChild('content', { static: true }) content: any;

  messages: any = [];
  messagesById: any = {};

  otherUserId = '';
  pendingMessage = '';
  messagePlaceholder = 'Message...';
  reloading = false;

  isViewLoaded = true;

  selectedChatIdx = -1;

  constructor(
    private changeDetector: ChangeDetectorRef,
    public navCtrl: NavController,
    public route: ActivatedRoute,
    public events: Events,
    public toastCtrl: ToastController,
    public loadingService: LoadingService,
    public websocketService: WebsocketService,
    public utilService: UtilService,
    public messagingService: MessagingService) {
    this.otherUserId = this.route.snapshot.paramMap.get('otherUserId');

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

  ionViewWillEnter() {
    this.isViewLoaded = true;

    if (!this.otherUserId) {
      this.navCtrl.navigateRoot(RouteMap.MessagesPage.getPath());
    } else {
      const loading = this.loadingService.start();

      let messageArea;
      try {
        this.content.getNativeElement().children[1].children[0];
      } catch (e) {}

      if (messageArea) messageArea.style.opacity = 0;
      this.loadMessages(true).then(() => {
        loading.dismiss();
        if (messageArea) messageArea.style.opacity = 1;
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

    this.loadMessages().finally(() => {
      setTimeout(() => {
        this.reloading = false; // TODO: Replace with better delay for minimum animation time
      }, 350);
    });
  }

  refresh(refresher) {
    this.loadMessages().then(() => {
      refresher.target.complete();
    }, () => {
      refresher.target.complete();
    });
  }

  scrollToBottom(animate?, delay?, callback?) {
    const animationDuration = animate ? 300 : 0;

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
    };
  }

  trackByFn(index, item) {
    return item.id;
  }

  loadMessages(isInitialLoad?) {
    return new Promise((resolve, reject) => {
      this.messagingService.fetch(this.otherUserId).then(response => {
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
      }).catch(err => {
        reject();

        if (!this.isViewLoaded) return;
        switch (err.response.status) {
          default:
            this.navCtrl.navigateRoot(RouteMap.MessagesPage.getPath());
            break;
        }
      });
    });
  }

  processMessages() {
    for (let i = 0; i < this.messages.length; i++) {
      const message = this.messages[i];
      message.deservesDateDiff = !!this.deservesDateDiff(this.messages[i - 1], message);
      if (message.deservesDateDiff) message.dateDiff = this.formatMessageDividerDate(message.createdAt);
      message.formattedDate = this.formatMessageDate(message.createdAt);
    }
  }

  sendMessage() {
    if (!this.pendingMessage) return;

    const myMessage = this.pendingMessage;
    this.pendingMessage = '';
    this.messagePlaceholder = 'Sending...';

    this.messagingService.create({
      to: this.otherUserId,
      body: myMessage
    }).then(response => {
      this.messagePlaceholder = 'Sent!';

      setTimeout(() => {
        this.messagePlaceholder = 'Message...';
      }, 1000);

      this.messages.push(response);

      this.processMessages();

      this.scrollToBottom(true, true);
    }).catch(async err => {
      this.messagePlaceholder = 'Message...';
      this.pendingMessage = myMessage;
      switch (err.response.status) {
        case 0:
          const offlineToast = await this.toastCtrl.create({
            message: this.utilService.standardMessages.offlinePushMessage,
            duration: 5000
          });
          offlineToast.present();
          break;
        default:
          const errorToast = await this.toastCtrl.create({
            message: 'Failed to send message.',
            duration: 5000
          });
          errorToast.present();
          break;
      }
    });
  }

  openRecipe(recipe) {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(recipe.id));
  }

  onMessageKeyUp(event) {
    if (!(event.keyCode == 10 || event.keyCode == 13)) return;

    if (event.ctrlKey || event.shiftKey || event.altKey) {
      this.pendingMessage += '\n';
    } else {
      this.sendMessage();
    }
  }

  deservesDateDiff(previous, next) {
    if (!previous || !next) return;

    const p = new Date(previous.createdAt);
    const n = new Date(next.createdAt);

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
