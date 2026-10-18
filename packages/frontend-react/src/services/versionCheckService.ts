import { httpService } from "./httpService";
import { serverConfig } from "../utils/serverConfig";
import { forceSWUpdate } from "../utils/forceSWUpdate";
import { i18n } from "../i18n/i18n";
import { showAlert } from "../components/dialogs/showAlert";

export const versionCheckService = {
  async checkVersion() {
    const version = window.version;
    if (version === "stg") return;

    const url = `${serverConfig.apiBase}versioncheck?version=${version}`;
    const result = await httpService.request<{ supported: boolean }>({
      method: "get",
      url,
    });

    if (!result.ok) {
      console.log("Unable to check for update.");
      return;
    }
    if (result.response.data?.supported !== false) return;

    void showAlert({
      header: i18n.t("services.versionCheck.outOfDate.header"),
      subHeader: i18n.t("services.versionCheck.outOfDate.message"),
      buttons: [
        {
          text: i18n.t("generic.okay"),
          role: "cancel",
          handler: () => {
            void forceSWUpdate().finally(() => {
              window.location.reload();
            });
          },
        },
      ],
    });
  },
};
