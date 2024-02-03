import { Component, ViewChild, ChangeDetectorRef } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NavController, ToastController } from "@ionic/angular";

import { linkifyStr } from "~/utils/linkify";
import { Message, MessagingService } from "~/services/messaging.service";
import { LoadingService } from "~/services/loading.service";
import { WebsocketService } from "~/services/websocket.service";
import { EventName, EventService } from "~/services/event.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { TranslateService } from "@ngx-translate/core";
import { Recipe } from "../../../services/recipe.service";

@Component({
  selector: "page-message-thread",
  templateUrl: "message-thread.page.html",
  styleUrls: ["message-thread.page.scss"],
})
export class MessageThreadPage {
  defaultBackHref: string = RouteMap.MessagesPage.getPath();

  @ViewChild("content", { static: true }) content: any;

  messages: (Message & {
    formattedDate?: string;
    deservesDateDiff?: boolean;
    dateDiff?: string;
  })[] = [];
  messagesById: { [key: string]: Message } = {};

  otherUserId = "";
  pendingMessage = "";
  messagePlaceholder = "";
  reloading = false;

  isViewLoaded = true;

  selectedChatIdx = -1;

  constructor(
    private changeDetector: ChangeDetectorRef,
    public navCtrl: NavController,
    public translate: TranslateService,
    public route: ActivatedRoute,
    public events: EventService,
    public toastCtrl: ToastController,
    public loadingService: LoadingService,
    public websocketService: WebsocketService,
    public utilService: UtilService,
    public messagingService: MessagingService,
  ) {
    const otherUserId = this.route.snapshot.paramMap.get("otherUserId");
    if (!otherUserId) {
      this.navCtrl.navigateBack(this.defaultBackHref);
      throw new Error("OtherUserId not provided");
    }
    this.otherUserId = otherUserId;

    this.websocketService.register(
      "messages:new",
      (payload) => {
        if (!this.isViewLoaded || payload.otherUser.id !== this.otherUserId)
          return;

        this.loadMessages().then(
          () => {},
          () => {},
        );
      },
      this,
    );

    events.subscribe(EventName.ApplicationMultitaskingResumed, () => {
      if (!this.isViewLoaded) return;

      this.loadMessages().then(
        () => {
          this.changeDetector.detectChanges();
        },
        () => {},
      );
    });
  }

  ionViewWillEnter() {
    this.translate
      .get("pages.messageThread.messagePlaceholder")
      .toPromise()
      .then((str: string) => (this.messagePlaceholder = str));

    this.isViewLoaded = true;

    if (!this.otherUserId) {
      this.navCtrl.navigateRoot(RouteMap.MessagesPage.getPath());
    } else {
      const loading = this.loadingService.start();

      let messageArea: any;
      try {
        messageArea = this.content.getNativeElement().children[1].children[0];
      } catch (e) {}

      if (messageArea) messageArea.style.opacity = 0;
      this.loadMessages(true).then(
        () => {
          loading.dismiss();
          if (messageArea) messageArea.style.opacity = 1;
        },
        () => {
          loading.dismiss();
        },
      );
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

  refresh(refresher: any) {
    this.loadMessages().then(
      () => {
        refresher.target.complete();
      },
      () => {
        refresher.target.complete();
      },
    );
  }

  scrollToBottom(animate?: boolean, delay?: boolean, callback?: () => any) {
    const animationDuration = animate ? 300 : 0;

    if (delay) {
      setTimeout(() => {
        this.content.scrollToBottom(animationDuration);
        callback?.();
      });
    } else {
      this.content.scrollToBottom(animationDuration);
    }
  }

  keyboardOpened() {
    window.onresize = () => {
      this.scrollToBottom(false, true);
      window.onresize = null;
    };
  }

  trackByFn(_: number, item: { id: string }) {
    return item.id;
  }

  async loadMessages(isInitialLoad?: boolean) {
    const response = await this.messagingService.fetch({
      user: this.otherUserId,
    });
    if (!response.success) return;

    this.messages = response.data.map((message) => {
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

    this.scrollToBottom(!isInitialLoad, true);
  }

  processMessages() {
    for (let i = 0; i < this.messages.length; i++) {
      const message = this.messages[i];
      message.deservesDateDiff = !!this.deservesDateDiff(
        this.messages[i - 1],
        message,
      );
      if (message.deservesDateDiff)
        message.dateDiff = this.formatMessageDividerDate(message.createdAt);
      message.formattedDate = this.formatMessageDate(message.createdAt);
    }
  }

  async sendMessage() {
    if (!this.pendingMessage) return;

    const sending = await this.translate
      .get("pages.messageThread.sending")
      .toPromise();
    const sent = await this.translate
      .get("pages.messageThread.sent")
      .toPromise();
    const message = await this.translate
      .get("pages.messageThread.messagePlaceholder")
      .toPromise();

    const myMessage = this.pendingMessage;
    this.pendingMessage = "";
    this.messagePlaceholder = sending;

    const response = await this.messagingService.create({
      to: this.otherUserId,
      body: myMessage,
    });
    if (!response.success) return (this.pendingMessage = myMessage);

    this.messagePlaceholder = sent;

    setTimeout(() => {
      this.messagePlaceholder = message;
    }, 1000);

    this.loadMessages();
  }

  openRecipe(recipe: NonNullable<Message["originalRecipe"]>) {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(recipe.id));
  }

  onMessageKeyUp(event: KeyboardEvent) {
    if (!(event.key === "10" || event.key === "13")) return;

    if (event.ctrlKey || event.shiftKey || event.altKey) {
      this.pendingMessage += "\n";
    } else {
      this.sendMessage();
    }
  }

  deservesDateDiff(
    previous: { createdAt: string },
    next: { createdAt: string },
  ) {
    if (!previous || !next) return;

    const p = new Date(previous.createdAt);
    const n = new Date(next.createdAt);

    return p.getDay() !== n.getDay();
  }

  formatMessageDividerDate(plainTextDate: Date | string | number) {
    return this.utilService.formatDate(plainTextDate);
  }

  formatMessageDate(plainTextDate: Date | string | number) {
    return this.utilService.formatDate(plainTextDate, {
      now: true,
      times: true,
    });
  }

  setSelectedChat(idx: number) {
    if (idx === this.selectedChatIdx) {
      this.selectedChatIdx = -1;
    } else {
      this.selectedChatIdx = idx;
    }
  }

  parseMessage(message: string) {
    return linkifyStr(message);
  }
}
