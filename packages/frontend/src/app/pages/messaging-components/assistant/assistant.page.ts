import { Component, ViewChild } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NavController, ToastController } from "@ionic/angular";

import { linkifyStr } from "~/utils/linkify";
import { MessagingService } from "~/services/messaging.service";
import { LoadingService } from "~/services/loading.service";
import { WebsocketService } from "~/services/websocket.service";
import { EventService } from "~/services/event.service";
import { UtilService, RouteMap } from "~/services/util.service";
import { TranslateService } from "@ngx-translate/core";
import { TRPCService } from "../../../services/trpc.service";
import type {
  AssistantMessageSummary,
  RecipeSummaryLite,
} from "@recipesage/trpc";

@Component({
  selector: "page-assistant",
  templateUrl: "assistant.page.html",
  styleUrls: ["assistant.page.scss"],
})
export class AssistantPage {
  @ViewChild("content", { static: true }) content: any;

  messages: (AssistantMessageSummary & {
    formattedDate?: string;
    deservesDateDiff?: boolean;
    dateDiff?: string;
  })[] = [];
  messagesById: { [key: string]: AssistantMessageSummary } = {};

  pendingMessage = "";
  processing = false;
  reloading = false;

  isViewLoaded = true;

  selectedChatIdx = -1;

  constructor(
    public navCtrl: NavController,
    public translate: TranslateService,
    public route: ActivatedRoute,
    public events: EventService,
    public toastCtrl: ToastController,
    public loadingService: LoadingService,
    public websocketService: WebsocketService,
    public utilService: UtilService,
    public messagingService: MessagingService,
    public trpcService: TRPCService,
  ) {}

  ionViewWillEnter() {
    this.isViewLoaded = true;

    const loading = this.loadingService.start();

    let messageArea: any;
    try {
      messageArea = this.content.getNativeElement().children[1].children[0];
    } catch (e) {}

    if (messageArea) messageArea.style.opacity = 0;
    this.loadMessages("bottom", false).then(
      () => {
        loading.dismiss();
        if (messageArea) messageArea.style.opacity = 1;
      },
      () => {
        loading.dismiss();
      },
    );
  }

  ionViewWillLeave() {
    this.isViewLoaded = false;
  }

  reload() {
    this.reloading = true;

    this.loadMessages("bottom", true).finally(() => {
      setTimeout(() => {
        this.reloading = false; // TODO: Replace with better delay for minimum animation time
      }, 350);
    });
  }

  refresh(refresher: any) {
    this.loadMessages("bottom", true).then(
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

  scrollIntoView(
    elRef: string | Element,
    animate?: boolean,
    delay?: boolean,
    callback?: () => any,
  ) {
    const go = () => {
      const element =
        typeof elRef === "string" ? document.querySelector(elRef) : elRef;
      if (!element) return;

      element.scrollIntoView({
        block: "start",
        inline: "nearest",
        behavior: animate ? "smooth" : "instant",
      });
      callback?.();
    };

    if (delay) {
      setTimeout(go);
    } else {
      go();
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

  async loadMessages(
    scrollBehavior?: "newest" | "bottom" | "none",
    animateScroll?: boolean,
  ) {
    const response = await this.trpcService.handle(
      this.trpcService.trpc.assistant.getAssistantMessages.query(),
    );
    if (!response) return;

    let firstNewMessage: AssistantMessageSummary | undefined = undefined;
    const messages = [];
    for (const message of response) {
      if (!message.content && !message.recipe) {
        continue;
      }

      if (!message.content) {
        messages.push(message);
        continue;
      }

      // Reuse messages that have already been parsed for performance. Otherwise, send it through linkify
      if (this.messagesById[message.id]) {
        message.content = this.messagesById[message.id].content;
      } else {
        message.content = this.parseMessage(message.content);
      }

      if (!this.messagesById[message.id] && !firstNewMessage)
        firstNewMessage = message;
      this.messagesById[message.id] = message;

      messages.push(message);
    }
    this.messages = messages;

    this.processMessages();

    if (!scrollBehavior || scrollBehavior === "bottom") {
      this.scrollToBottom(animateScroll, true);
    }
    if (scrollBehavior === "newest" && firstNewMessage) {
      this.scrollIntoView(
        `#message-${firstNewMessage.id}`,
        animateScroll,
        true,
      );
    }
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
    const pendingMessage = this.pendingMessage;
    if (this.processing || !pendingMessage) return;

    this.processing = true;

    const response = await this.trpcService.handle(
      this.trpcService.trpc.assistant.sendAssistantMessage.query({
        content: pendingMessage,
      }),
      {
        429: async () => {
          const message = await this.translate
            .get("pages.assistant.messageLimit")
            .toPromise();
          const close = await this.translate.get("generic.close").toPromise();

          const toast = await this.toastCtrl.create({
            message,
            buttons: [
              {
                text: close,
                role: "cancel",
              },
            ],
          });
          await toast.present();
          return;
        },
      },
    );

    if (!response) {
      setTimeout(() => {
        this.pendingMessage = pendingMessage;
      }, 150);
    }

    this.processing = false;
    this.pendingMessage = "";
    this.loadMessages("newest", true);

    setTimeout(() => {
      (
        document.querySelector(
          "#assistant-message-textarea textarea",
        ) as HTMLElement
      )?.focus();
    });
  }

  openRecipe(recipe: RecipeSummaryLite) {
    this.navCtrl.navigateForward(RouteMap.RecipePage.getPath(recipe.id));
  }

  onMessageKeyDown(event: KeyboardEvent) {
    if (event.key !== "Enter") return;
    event.preventDefault();

    if (event.ctrlKey || event.shiftKey || event.altKey) {
      this.pendingMessage += "\n";
    } else {
      this.sendMessage();
    }
  }

  deservesDateDiff(
    previous: { createdAt: Date | string | number },
    next: { createdAt: Date | string | number },
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
