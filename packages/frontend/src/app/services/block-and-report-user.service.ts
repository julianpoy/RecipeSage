import { Injectable, inject } from "@angular/core";
import { AlertController, ToastController } from "@ionic/angular/standalone";
import { TranslateService } from "@ngx-translate/core";

import { ServerActionsService } from "./server-actions.service";
import { LoadingService } from "./loading.service";

interface BlockAndReportUserTarget {
  id: string;
  name: string;
}

@Injectable({
  providedIn: "root",
})
export class BlockAndReportUserService {
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private translate = inject(TranslateService);
  private loadingService = inject(LoadingService);
  private serverActionsService = inject(ServerActionsService);

  async reportUser(user: BlockAndReportUserTarget): Promise<void> {
    const header = await this.translate
      .get("services.blockAndReportUser.report.header", { name: user.name })
      .toPromise();
    const message = await this.translate
      .get("services.blockAndReportUser.report.message")
      .toPromise();
    const placeholder = await this.translate
      .get("services.blockAndReportUser.report.reasonPlaceholder")
      .toPromise();
    const tooShort = await this.translate
      .get("services.blockAndReportUser.report.reasonTooShort")
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate
      .get("services.blockAndReportUser.report.confirm")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      inputs: [
        {
          name: "reason",
          type: "textarea",
          placeholder,
          attributes: {
            maxlength: 2000,
          },
        },
      ],
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: confirm,
          cssClass: "alertDanger",
          handler: (data) => {
            const reason = (data.reason || "").trim();
            if (reason.length < 5) {
              this.toastCtrl
                .create({
                  message: tooShort,
                  duration: 5000,
                })
                .then((toast) => toast.present());
              return false;
            }
            this.submitUserReport(user, reason);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async submitUserReport(
    user: BlockAndReportUserTarget,
    reason: string,
  ) {
    const loading = this.loadingService.start();
    const response = await this.serverActionsService.users.reportUser({
      userId: user.id,
      reason,
    });
    loading.dismiss();

    if (!response) return;

    await this.presentToast(
      await this.translate
        .get("services.blockAndReportUser.report.success")
        .toPromise(),
    );
  }

  async blockUser(user: BlockAndReportUserTarget): Promise<boolean> {
    const header = await this.translate
      .get("services.blockAndReportUser.block.header", { name: user.name })
      .toPromise();
    const message = await this.translate
      .get("services.blockAndReportUser.block.message", { name: user.name })
      .toPromise();
    const cancel = await this.translate.get("generic.cancel").toPromise();
    const confirm = await this.translate
      .get("services.blockAndReportUser.block.confirm")
      .toPromise();

    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: "cancel",
        },
        {
          text: confirm,
          role: "confirm",
          cssClass: "alertDanger",
        },
      ],
    });
    await alert.present();

    const { role } = await alert.onDidDismiss();
    if (role !== "confirm") return false;

    const loading = this.loadingService.start();
    const response = await this.serverActionsService.users.blockUser({
      userId: user.id,
    });
    loading.dismiss();

    if (!response) return false;

    await this.presentToast(
      await this.translate
        .get("services.blockAndReportUser.block.success", { name: user.name })
        .toPromise(),
    );
    return true;
  }

  async unblockUser(user: BlockAndReportUserTarget): Promise<boolean> {
    const loading = this.loadingService.start();
    const response = await this.serverActionsService.users.unblockUser({
      userId: user.id,
    });
    loading.dismiss();

    if (!response) return false;

    await this.presentToast(
      await this.translate
        .get("services.blockAndReportUser.unblock.success", {
          name: user.name,
        })
        .toPromise(),
    );
    return true;
  }

  private async presentToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 5000,
    });
    await toast.present();
  }
}
