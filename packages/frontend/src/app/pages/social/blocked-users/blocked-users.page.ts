import { Component, inject } from "@angular/core";
import { NavController } from "@ionic/angular/standalone";

import { ServerActionsService } from "../../../services/server-actions.service";
import type { RouterOutputs } from "../../../services/server-actions/actions-base";
import { LoadingService } from "../../../services/loading.service";
import { BlockAndReportUserService } from "../../../services/block-and-report-user.service";
import { RouteMap } from "../../../services/util.service";
import { SHARED_UI_IMPORTS } from "../../../providers/shared-ui.provider";
import { NullStateComponent } from "../../../components/null-state/null-state.component";
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonLabel,
  IonButton,
  IonItem,
  IonAvatar,
  IonList,
  IonSpinner,
} from "@ionic/angular/standalone";
import { banOutline } from "ionicons/icons";
import { addIcons } from "ionicons";

@Component({
  standalone: true,
  selector: "page-blocked-users",
  templateUrl: "blocked-users.page.html",
  styleUrls: ["blocked-users.page.scss"],
  imports: [
    ...SHARED_UI_IMPORTS,
    NullStateComponent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonIcon,
    IonLabel,
    IonButton,
    IonItem,
    IonAvatar,
    IonList,
    IonSpinner,
  ],
})
export class BlockedUsersPage {
  private navCtrl = inject(NavController);
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);
  private blockAndReportUserService = inject(BlockAndReportUserService);

  defaultBackHref: string = RouteMap.PeoplePage.getPath();

  blockedUsers?: RouterOutputs["users"]["getMyBlockedUsers"];
  loading = true;

  constructor() {
    addIcons({ banOutline });
  }

  ionViewWillEnter() {
    this.load();
  }

  async load() {
    const loading = this.loadingService.start();
    const blockedUsers =
      await this.serverActionsService.users.getMyBlockedUsers();
    this.loading = false;
    loading.dismiss();

    if (!blockedUsers) return;
    this.blockedUsers = blockedUsers;
  }

  async unblockUser(
    blockedUser: RouterOutputs["users"]["getMyBlockedUsers"][number],
  ) {
    const unblocked =
      await this.blockAndReportUserService.unblockUser(blockedUser);
    if (unblocked) this.load();
  }

  canOpenProfile(
    blockedUser: RouterOutputs["users"]["getMyBlockedUsers"][number],
  ) {
    return blockedUser.enableProfile && !!blockedUser.handle;
  }

  openProfile(
    blockedUser: RouterOutputs["users"]["getMyBlockedUsers"][number],
  ) {
    if (!this.canOpenProfile(blockedUser)) return;
    this.navCtrl.navigateForward(
      RouteMap.ProfilePage.getPath(`@${blockedUser.handle}`),
    );
  }
}
