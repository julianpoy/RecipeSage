import { i18n } from "../i18n/i18n";
import { showAlert } from "../components/dialogs/showAlert";
import { showToast } from "../components/dialogs/showToast";
import { usersActions } from "./server-actions/usersActions";
import { loadingService } from "./loadingService";

interface BlockAndReportUserTarget {
  id: string;
  name: string;
}

const presentToast = (message: string) => {
  showToast({
    message,
    duration: 5000,
  });
};

const submitUserReport = async (
  user: BlockAndReportUserTarget,
  reason: string,
) => {
  const loading = loadingService.start();
  const response = await usersActions.reportUser({
    userId: user.id,
    reason,
  });
  loading.dismiss();
  if (!response) return;

  presentToast(i18n.t("services.blockAndReportUser.report.success"));
};

export const blockAndReportUserService = {
  async reportUser(user: BlockAndReportUserTarget): Promise<void> {
    await showAlert({
      header: i18n.t("services.blockAndReportUser.report.header", {
        name: user.name,
      }),
      message: i18n.t("services.blockAndReportUser.report.message"),
      inputs: [
        {
          name: "reason",
          type: "textarea",
          placeholder: i18n.t(
            "services.blockAndReportUser.report.reasonPlaceholder",
          ),
          maxLength: 2000,
        },
      ],
      buttons: [
        {
          text: i18n.t("generic.cancel"),
          role: "cancel",
        },
        {
          text: i18n.t("services.blockAndReportUser.report.confirm"),
          variant: "destructive",
          handler: (values) => {
            const reason = (values.reason || "").trim();
            if (reason.length < 5) {
              presentToast(
                i18n.t("services.blockAndReportUser.report.reasonTooShort"),
              );
              return false;
            }
            void submitUserReport(user, reason);
            return true;
          },
        },
      ],
    });
  },

  async blockUser(user: BlockAndReportUserTarget): Promise<boolean> {
    const { role } = await showAlert({
      header: i18n.t("services.blockAndReportUser.block.header", {
        name: user.name,
      }),
      message: i18n.t("services.blockAndReportUser.block.message", {
        name: user.name,
      }),
      buttons: [
        {
          text: i18n.t("generic.cancel"),
          role: "cancel",
        },
        {
          text: i18n.t("services.blockAndReportUser.block.confirm"),
          role: "confirm",
          variant: "destructive",
        },
      ],
    });
    if (role !== "confirm") return false;

    const loading = loadingService.start();
    const response = await usersActions.blockUser({
      userId: user.id,
    });
    loading.dismiss();
    if (!response) return false;

    presentToast(
      i18n.t("services.blockAndReportUser.block.success", { name: user.name }),
    );
    return true;
  },

  async unblockUser(user: BlockAndReportUserTarget): Promise<boolean> {
    const loading = loadingService.start();
    const response = await usersActions.unblockUser({
      userId: user.id,
    });
    loading.dismiss();
    if (!response) return false;

    presentToast(
      i18n.t("services.blockAndReportUser.unblock.success", {
        name: user.name,
      }),
    );
    return true;
  },
};
