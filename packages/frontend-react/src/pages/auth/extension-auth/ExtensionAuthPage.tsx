import { useEffect, useState } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { SessionDTO } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { IS_SELFHOST } from "../../../environments/environment";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { LogoIcon } from "../../../components/LogoIcon";
import { appIdbStorageManager } from "../../../utils/appIdbStorageManager";

const routeApi = getRouteApi("/auth/extension");

const OFFICIAL_REDIRECT_URI_PREFIXES = [
  "https://oepplnnfceidfaaacjpdpobnjkcpgcpo.chromiumapp.org/",
  "https://d673274367b633a37d65c677789efa4e718ae7e6.extensions.allizom.org/",
];

const isValidExtensionRedirectUri = (value: string): boolean => {
  try {
    const url = new URL(value);
    if (url.protocol === "moz-extension:") return true;
    if (url.protocol === "https:") {
      if (url.hostname.endsWith(".chromiumapp.org")) return true;
      if (url.hostname.endsWith(".extensions.allizom.org")) return true;
    }
    return false;
  } catch {
    return false;
  }
};

const isOfficialRedirectUri = (value: string): boolean =>
  OFFICIAL_REDIRECT_URI_PREFIXES.some((prefix) => value.startsWith(prefix));

const buildReturnPath = (redirectUri: string, state: string) =>
  `/auth/extension?redirect_uri=${encodeURIComponent(
    redirectUri,
  )}&state=${encodeURIComponent(state)}`;

export const ExtensionAuthPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = routeApi.useSearch();

  const redirectUri = search.redirect_uri || "";
  const state = search.state || "";
  const invalidRequest =
    !redirectUri || !state || !isValidExtensionRedirectUri(redirectUri);
  const isOfficial = !invalidRequest && isOfficialRedirectUri(redirectUri);

  const [existingSession, setExistingSession] = useState<SessionDTO>();
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    if (invalidRequest) return;

    const redirectToLogin = () => {
      void navigate({
        to: "/auth/$authType",
        params: { authType: "login" },
        search: { redirect: buildReturnPath(redirectUri, state) },
        replace: true,
      });
    };

    let cancelled = false;
    void appIdbStorageManager.getSession().then((currentSession) => {
      if (cancelled) return;
      if (!currentSession) {
        redirectToLogin();
        return;
      }
      setExistingSession(currentSession);
      setLoadingSession(false);
    });

    return () => {
      cancelled = true;
    };
  }, [invalidRequest, redirectUri, state, navigate]);

  const switchAccount = async () => {
    setLoadingSession(true);
    localStorage.removeItem("token");
    await appIdbStorageManager.deleteAllData();
    setExistingSession(undefined);

    void navigate({
      to: "/auth/$authType",
      params: { authType: "login" },
      search: { redirect: buildReturnPath(redirectUri, state) },
      replace: true,
    });
  };

  const continueWithSession = () => {
    if (!existingSession) return;
    if (!redirectUri || !state) return;
    const url = `${redirectUri}#token=${encodeURIComponent(
      existingSession.token,
    )}&state=${encodeURIComponent(state)}`;
    window.location.replace(url);
  };

  const welcome = (title: string, message: string) => (
    <div className="text-center text-foreground">
      <h2 className="mb-2 text-2xl font-semibold">{title}</h2>
      <span>{message}</span>
    </div>
  );

  return (
    <>
      <PageHeader start={null} title={t("pages.extensionAuth.title")} />
      <PageContent>
        <div className="mx-auto flex max-w-content flex-col gap-4 pt-4">
          {!IS_SELFHOST && <LogoIcon noBg />}

          {invalidRequest &&
            welcome(
              t("pages.extensionAuth.invalidRequest.title"),
              t("pages.extensionAuth.invalidRequest.message"),
            )}

          {!invalidRequest &&
            loadingSession &&
            welcome(
              t("pages.extensionAuth.title"),
              t("pages.extensionAuth.loading"),
            )}

          {!invalidRequest && !loadingSession && existingSession && (
            <>
              {welcome(
                t("pages.extensionAuth.title"),
                t("pages.extensionAuth.banner"),
              )}

              {isOfficial ? (
                <div className="mt-8 rounded-md bg-[rgba(46,184,113,0.12)] px-4 py-3 text-center text-[#1e7e44] dark:text-[#5fd497]">
                  {t("pages.extensionAuth.officialBadge")}
                </div>
              ) : (
                <div className="mt-8 rounded-md bg-[rgba(217,87,65,0.12)] px-4 py-3 text-center text-[#a8351b] dark:text-[#f08a73]">
                  <strong>
                    {t("pages.extensionAuth.unofficialWarning.title")}
                  </strong>
                  <br />
                  {t("pages.extensionAuth.unofficialWarning.body")}
                </div>
              )}

              <div className="text-center text-sm break-words text-foreground">
                {t("pages.extensionAuth.signedInAs", {
                  email: existingSession.email,
                })}
              </div>

              <div className="flex flex-col gap-2 p-4">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={continueWithSession}
                >
                  {t("pages.extensionAuth.continue")}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full text-primary"
                  onClick={() => void switchAccount()}
                >
                  {t("pages.extensionAuth.useDifferentAccount")}
                </Button>
              </div>
            </>
          )}
        </div>
      </PageContent>
    </>
  );
};
