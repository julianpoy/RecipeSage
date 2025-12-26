import { Component, ViewChild, ChangeDetectorRef, inject } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NavController } from "@ionic/angular";

import { linkifyStr } from "~/utils/linkify";
import { Message, MessagingService } from "~/services/messaging.service";
import { LoadingService } from "~/services/loading.service";
import { WebsocketService } from "~/services/websocket.service";
import { EventName, EventService } from "~/services/event.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { TranslateService } from "@ngx-translate/core";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";

@Component({
  standalone: true,
  selector: "page-message-thread",
  templateUrl: "message-thread.page.html",
  styleUrls: ["message-thread.page.scss"],
  imports: [...SHARED_UI_IMPORTS],
})
export class MessageThreadPage {
  private changeDetector = inject(ChangeDetectorRef);
  private navCtrl = inject(NavController);
  private translate = inject(TranslateService);
  private route = inject(ActivatedRoute);
  private events = inject(EventService);
  private loadingService = inject(LoadingService);
  private websocketService = inject(WebsocketService);
  private utilService = inject(UtilService);
  private messagingService = inject(MessagingService);

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

  selectedChatIdx = -1;

  constructor() {
    const otherUserId = this.route.snapshot.paramMap.get("otherUserId");
    if (!otherUserId) {
      this.navCtrl.navigateBack(this.defaultBackHref);
      throw new Error("OtherUserId not provided");
    }
    this.otherUserId = otherUserId;
  }

  ionViewWillEnter() {
    this.translate
      .get("pages.messageThread.messagePlaceholder")
      .toPromise()
      .then((str: string) => (this.messagePlaceholder = str));

    const loading = this.loadingService.start();

    let messageArea: any;
    try {
      messageArea = this.content.getNativeElement().children[1].children[0];
    } catch (e) {}

    if (messageArea) messageArea.style.opacity = 0;
    this.loadMessages(true).finally(() => {
      loading.dismiss();
      if (messageArea) messageArea.style.opacity = 1;
    });

    this.websocketService.on("messages:new", this.onWSEvent);
    this.events.subscribe(
      EventName.ApplicationMultitaskingResumed,
      this.loadMessages,
    );
  }

  ionViewWillLeave() {
    this.websocketService.off("messages:new", this.onWSEvent);
    this.events.unsubscribe(
      EventName.ApplicationMultitaskingResumed,
      this.loadMessages,
    );
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

  onWSEvent = (data: Record<string, Record<string, string>>) => {
    if (data.otherUser.id !== this.otherUserId) {
      return;
    }

    this.loadMessages();
  };

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

  loadMessages = async (isInitialLoad?: boolean) => {
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
  };

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
