import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ServerIcon, TriangleAlertIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_API_BASE_URL,
  DEFAULT_GRIP_WS_URL,
} from "../../../environments/environment";
import { showAlert } from "../../../components/dialogs/showAlert";
import { TextField } from "../../../components/forms/TextField";
import { InfoBlock } from "../../../components/info-block/InfoBlock";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { FeatureFlagKeys, featureFlags } from "../../../services/featureFlags";
import { logoutService } from "../../../services/logoutService";
import {
  BETA_API_BASE_URL,
  BETA_GRIP_WS_BASE,
  canCustomizeServerUrls,
  canCustomizeWebBase,
  CUSTOM_API_BASE_URL_KEY,
  CUSTOM_GRIP_WS_URL_KEY,
  CUSTOM_WEB_BASE_URL_KEY,
  SERVER_PRESET_STORAGE_KEY,
  serverConfig,
} from "../../../utils/serverConfig";

type SelectablePreset = "default" | "beta" | "custom";

interface ServerTarget {
  apiBase: string;
  gripWsBase: string;
  webBase: string | null;
}

const isSelectablePreset = (value: unknown): value is SelectablePreset =>
  value === "default" || value === "beta" || value === "custom";

const validateUrl = (value: string, protocols: string[]): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (!protocols.includes(parsed.protocol)) return null;
  } catch {
    return null;
  }

  return trimmed;
};

const resolveApiBase = (apiBase: string): string | null => {
  const value = validateUrl(apiBase, ["http:", "https:"]);
  if (!value) return null;

  return value.endsWith("/") ? value : `${value}/`;
};

const resolveWebBase = (webBase: string): string | null => {
  const value = validateUrl(webBase, ["http:", "https:"]);
  if (!value) return null;

  const parsed = new URL(value);
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) return null;

  return parsed.origin;
};

const initialPreset: SelectablePreset =
  serverConfig.preset === "beta" || serverConfig.preset === "custom"
    ? serverConfig.preset
    : "default";

export const ServerSettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const showBeta = featureFlags[FeatureFlagKeys.EnableBetaServerPreset];

  const [unlocked, setUnlocked] = useState(false);
  const [preset, setPreset] = useState<SelectablePreset>(initialPreset);
  const [apiBase, setApiBase] = useState(
    serverConfig.preset === "custom" ? serverConfig.apiBase : "",
  );
  const [gripWsBase, setGripWsBase] = useState(
    serverConfig.preset === "custom" ? serverConfig.gripWsBase : "",
  );
  const [webBase, setWebBase] = useState(
    serverConfig.preset === "custom" ? serverConfig.webBase : "",
  );
  const [apiBaseInvalid, setApiBaseInvalid] = useState(false);
  const [gripWsInvalid, setGripWsInvalid] = useState(false);
  const [webBaseInvalid, setWebBaseInvalid] = useState(false);

  useEffect(() => {
    if (!canCustomizeServerUrls) {
      void navigate({ to: "/settings", replace: true });
    }
  }, [navigate]);

  const onPresetChange = (newPreset: SelectablePreset) => {
    setPreset(newPreset);
    setApiBaseInvalid(false);
    setGripWsInvalid(false);
    setWebBaseInvalid(false);
  };

  let previewApiBase = DEFAULT_API_BASE_URL;
  if (preset === "beta") previewApiBase = BETA_API_BASE_URL;
  if (preset === "custom") previewApiBase = resolveApiBase(apiBase) || "";

  const resolveTarget = (): ServerTarget | null => {
    switch (preset) {
      case "beta":
        return {
          apiBase: BETA_API_BASE_URL,
          gripWsBase: BETA_GRIP_WS_BASE,
          webBase: null,
        };
      case "custom": {
        const resolvedApiBase = resolveApiBase(apiBase);
        const resolvedGripWsBase = validateUrl(gripWsBase, ["ws:", "wss:"]);
        const resolvedWebBase = canCustomizeWebBase
          ? resolveWebBase(webBase)
          : null;
        const isWebBaseInvalid = canCustomizeWebBase && !resolvedWebBase;

        setApiBaseInvalid(!resolvedApiBase);
        setGripWsInvalid(!resolvedGripWsBase);
        setWebBaseInvalid(isWebBaseInvalid);
        if (!resolvedApiBase || !resolvedGripWsBase || isWebBaseInvalid) {
          return null;
        }

        return {
          apiBase: resolvedApiBase,
          gripWsBase: resolvedGripWsBase,
          webBase: resolvedWebBase,
        };
      }
      default:
        return {
          apiBase: DEFAULT_API_BASE_URL,
          gripWsBase: DEFAULT_GRIP_WS_URL,
          webBase: null,
        };
    }
  };

  const applyServerChange = async (target: ServerTarget) => {
    if (preset === "custom") {
      localStorage.setItem(SERVER_PRESET_STORAGE_KEY, "custom");
      localStorage.setItem(CUSTOM_API_BASE_URL_KEY, target.apiBase);
      localStorage.setItem(CUSTOM_GRIP_WS_URL_KEY, target.gripWsBase);
      if (target.webBase) {
        localStorage.setItem(CUSTOM_WEB_BASE_URL_KEY, target.webBase);
      } else {
        localStorage.removeItem(CUSTOM_WEB_BASE_URL_KEY);
      }
    } else {
      localStorage.setItem(SERVER_PRESET_STORAGE_KEY, preset);
    }

    await logoutService.logout();
    window.location.reload();
  };

  const save = async () => {
    const target = resolveTarget();
    if (!target) return;

    const customPresetChanged =
      (preset === "custom") !== (serverConfig.preset === "custom");
    const serverChanged =
      customPresetChanged ||
      target.apiBase !== serverConfig.apiBase ||
      target.gripWsBase !== serverConfig.gripWsBase;

    if (!serverChanged) {
      if (target.webBase && target.webBase !== serverConfig.webBase) {
        localStorage.setItem(CUSTOM_WEB_BASE_URL_KEY, target.webBase);
        window.location.reload();
        return;
      }

      void navigate({ to: "/settings", replace: true });
      return;
    }

    await showAlert({
      header: t("pages.serverSettings.switchConfirm.header"),
      message: t("pages.serverSettings.switchConfirm.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("pages.serverSettings.switchConfirm.confirm"),
          role: "destructive",
          handler: () => {
            void applyServerChange(target);
          },
        },
      ],
    });
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/settings" }} />}
        title={t("pages.serverSettings.title")}
      />
      <PageContent>
        <div className="mx-auto flex max-w-page flex-col gap-4">
          {!unlocked ? (
            <>
              <InfoBlock
                icon={<TriangleAlertIcon />}
                color="danger"
                title={t("pages.serverSettings.warning.title")}
              >
                <p>{t("pages.serverSettings.warning.body")}</p>
              </InfoBlock>

              <Button
                variant="outline"
                size="lg"
                className="w-full border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setUnlocked(true)}
              >
                {t("pages.serverSettings.confirm")}
              </Button>
            </>
          ) : (
            <>
              <InfoBlock
                icon={<ServerIcon />}
                title={t("pages.serverSettings.intro.title")}
              >
                <p>{t("pages.serverSettings.intro.body")}</p>
              </InfoBlock>

              <Tabs
                value={preset}
                onValueChange={(value) => {
                  if (isSelectablePreset(value)) onPresetChange(value);
                }}
              >
                <TabsList className="h-10! w-full">
                  <TabsTrigger value="default">
                    {t("pages.serverSettings.preset.default")}
                  </TabsTrigger>
                  {showBeta && (
                    <TabsTrigger value="beta">
                      {t("pages.serverSettings.preset.beta")}
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="custom">
                    {t("pages.serverSettings.preset.custom")}
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {preset === "custom" && (
                <>
                  <TextField
                    label={t("pages.serverSettings.apiBase.label")}
                    placeholder={t("pages.serverSettings.apiBase.placeholder")}
                    helperText={t("pages.serverSettings.apiBase.helper")}
                    errorText={t("pages.serverSettings.apiBase.invalid")}
                    invalid={apiBaseInvalid}
                    type="url"
                    inputMode="url"
                    dir="ltr"
                    value={apiBase}
                    onValueChange={setApiBase}
                  />

                  <TextField
                    label={t("pages.serverSettings.gripWs.label")}
                    placeholder={t("pages.serverSettings.gripWs.placeholder")}
                    helperText={t("pages.serverSettings.gripWs.helper")}
                    errorText={t("pages.serverSettings.gripWs.invalid")}
                    invalid={gripWsInvalid}
                    type="url"
                    inputMode="url"
                    dir="ltr"
                    value={gripWsBase}
                    onValueChange={setGripWsBase}
                  />

                  {canCustomizeWebBase && (
                    <TextField
                      label={t("pages.serverSettings.webBase.label")}
                      placeholder={t(
                        "pages.serverSettings.webBase.placeholder",
                      )}
                      helperText={t("pages.serverSettings.webBase.helper")}
                      errorText={t("pages.serverSettings.webBase.invalid")}
                      invalid={webBaseInvalid}
                      type="url"
                      inputMode="url"
                      dir="ltr"
                      value={webBase}
                      onValueChange={setWebBase}
                    />
                  )}
                </>
              )}

              {!!previewApiBase && (
                <div className="rounded-lg border bg-muted/50 px-4 py-3">
                  <p className="mb-1 text-[0.72rem] tracking-wide text-muted-foreground uppercase">
                    {t("pages.serverSettings.endpoint")}
                  </p>
                  <p
                    dir="ltr"
                    className="text-start font-semibold break-all text-foreground"
                  >
                    {previewApiBase}
                  </p>
                  {preset === "default" && (
                    <p className="mt-2 text-[0.8rem] leading-snug text-muted-foreground">
                      {t("pages.serverSettings.default.description")}
                    </p>
                  )}
                  {preset === "beta" && (
                    <p className="mt-2 text-[0.8rem] leading-snug text-muted-foreground">
                      {t("pages.serverSettings.beta.description")}
                    </p>
                  )}
                </div>
              )}

              <Button size="lg" className="w-full" onClick={() => void save()}>
                {t("generic.save")}
              </Button>
            </>
          )}
        </div>
      </PageContent>
    </>
  );
};
