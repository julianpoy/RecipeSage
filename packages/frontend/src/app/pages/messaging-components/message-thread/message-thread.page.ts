import {
  Component,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  inject,
} from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { NavController } from "@ionic/angular/standalone";

import { linkifyStr } from "../../../utils/linkify";
import type { MessageSummary } from "@recipesage/prisma";
import { ServerActionsService } from "../../../services/server-actions.service";
import { LoadingService } from "../../../services/loading.service";
import { WebsocketService } from "../../../services/websocket.service";
import { EventName, EventService } from "../../../services/event.service";
import { UtilService, RouteMap } from "../../../services/util.service";
import { TranslateService } from "@ngx-translate/core";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonButton,
  IonIcon,
  IonContent,
  IonItem,
  IonAvatar,
  IonLabel,
  IonFooter,
  IonTextarea,
} from "@ionic/angular/standalone";
import { refresh, send } from "ionicons/icons";
import { addIcons } from "ionicons";

interface MessageParsedDetails {
  body: string;
  formattedDate: string;
  deservesDateDiff: boolean;
  dateDiff?: string;
}

interface ThreadMessage {
  message: MessageSummary;
  parsedDetails: MessageParsedDetails;
}

@Component({
  standalone: true,
  selector: "page-message-thread",
  templateUrl: "message-thread.page.html",
  styleUrls: ["message-thread.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonItem,
    IonAvatar,
    IonLabel,
    IonFooter,
    IonTextarea,
  ],
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
  private serverActionsService = inject(ServerActionsService);

  defaultBackHref: string = RouteMap.MessagesPage.getPath();

  @ViewChild("content", { static: true }) content!: IonContent;
  @ViewChild("content", { static: true, read: ElementRef })
  contentElement!: ElementRef<HTMLElement>;

  messages: ThreadMessage[] = [];
  private parsedBodyById = new Map<string, string>();

  otherUserId = "";
  otherUserName = "";
  pendingMessage = "";
  messagePlaceholder = "";
  reloading = false;

  selectedChatIdx = -1;

  constructor() {
    addIcons({ refresh, send });
    this.applyRouteParams();
  }

  private applyRouteParams() {
    const otherUserId = this.route.snapshot.paramMap.get("otherUserId");
    if (!otherUserId) {
      this.navCtrl.navigateBack(this.defaultBackHref);
      throw new Error("OtherUserId not provided");
    }
    this.otherUserId = otherUserId;
  }

  ionViewWillEnter() {
    const snapshotOtherUserId = this.route.snapshot.paramMap.get("otherUserId");
    if (snapshotOtherUserId && snapshotOtherUserId !== this.otherUserId) {
      this.applyRouteParams();
      this.messages = [];
      this.parsedBodyById.clear();
    }

    this.translate
      .get("pages.messageThread.messagePlaceholder")
      .toPromise()
      .then((str: string) => (this.messagePlaceholder = str));

    const loading = this.loadingService.start();

    let messageArea: HTMLElement | undefined;
    try {
      const candidate =
        this.contentElement.nativeElement.children[1]?.children[0];
      if (candidate instanceof HTMLElement) messageArea = candidate;
    } catch (e) {}

    if (messageArea) messageArea.style.opacity = "0";
    this.loadMessages(true).finally(() => {
      loading.dismiss();
      if (messageArea) messageArea.style.opacity = "1";
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

  onWSEvent = (data: Record<string, Record<string, string>>) => {
    if (data.otherUser.id !== this.otherUserId) {
      return;
    }

    this.loadMessages();
  };

  scrollToBottom(animate?: boolean, delay?: boolean, callback?: () => void) {
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

  trackByFn(_: number, item: ThreadMessage) {
    return item.message.id;
  }

  loadMessages = async (isInitialLoad?: boolean) => {
    const response = await this.serverActionsService.messages.getThread({
      userId: this.otherUserId,
    });
    if (!response) return;

    this.otherUserName = response.messageThread.otherUser.name;

    const messages = response.messages;
    this.messages = messages.map((message, index) => ({
      message,
      parsedDetails: this.buildParsedDetails(message, messages[index - 1]),
    }));

    this.scrollToBottom(!isInitialLoad, true);
  };

  private buildParsedDetails(
    message: MessageSummary,
    previous: MessageSummary | undefined,
  ): MessageParsedDetails {
    let body = this.parsedBodyById.get(message.id);
    if (body === undefined) {
      body = this.parseMessage(message.body);
      this.parsedBodyById.set(message.id, body);
    }

    const deservesDateDiff = !!this.deservesDateDiff(previous, message);

    return {
      body,
      formattedDate: this.formatMessageDate(message.createdAt),
      deservesDateDiff,
      dateDiff: deservesDateDiff
        ? this.formatMessageDividerDate(message.createdAt)
        : undefined,
    };
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

    const response = await this.serverActionsService.messages.createMessage({
      to: this.otherUserId,
      body: myMessage,
    });
    if (!response) return (this.pendingMessage = myMessage);

    this.messagePlaceholder = sent;

    setTimeout(() => {
      this.messagePlaceholder = message;
    }, 1000);

    this.loadMessages();
  }

  openRecipe(recipe: NonNullable<MessageSummary["originalRecipe"]>) {
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
    previous: { createdAt: Date | string } | undefined,
    next: { createdAt: Date | string },
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
