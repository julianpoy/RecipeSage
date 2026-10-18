import { useEffect, useEffectEvent, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import type { SessionDTO } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import {
  GOOGLE_GSI_CLIENT_ID,
  IS_SELFHOST,
} from "../../environments/environment";
import { serverActions } from "../../services/serverActions";
import { getIsElectron } from "../../utils/electron";
import { serverConfig } from "../../utils/serverConfig";
import { SSO_PENDING_PROVIDER_KEY } from "../../utils/ssoRedirect";
import { i18n } from "../../i18n/i18n";
import { showToast } from "../dialogs/showToast";
import { createPkceChallenge } from "./createPkceChallenge";
import { useSsoRedirectCode } from "./useSsoRedirectCode";

const PKCE_VERIFIER_STORAGE_KEY = "googleSignInPkceVerifier";
const GOOGLE_SCRIPT_NODE_ID = "google-auth-script";

const isElectron = getIsElectron();
const isNative = Capacitor.isNativePlatform();

export const SignInWithGoogle = ({
  showButton = true,
  autoPrompt = false,
  allowRegistration = false,
  onSignInComplete,
  onAccountNotFound,
}: {
  showButton?: boolean;
  autoPrompt?: boolean;
  allowRegistration?: boolean;
  onSignInComplete: (session: SessionDTO) => void;
  onAccountNotFound: () => void;
}) => {
  const { t } = useTranslation();
  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  const afterSignInComplete = useEffectEvent(
    async (response: GoogleCredentialResponse) => {
      const session = await serverActions.users.signInWithGoogle(
        {
          clientId: response.clientId,
          credential: response.credential,
          allowRegistration,
        },
        {
          404: () => onAccountNotFound(),
        },
      );

      if (session) onSignInComplete(session);
    },
  );

  useSsoRedirectCode(async (code) => {
    if (localStorage.getItem(SSO_PENDING_PROVIDER_KEY) !== "google") return;
    localStorage.removeItem(SSO_PENDING_PROVIDER_KEY);

    const codeVerifier = localStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
    localStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
    if (!codeVerifier) {
      showToast({
        message: i18n.t("components.signInWithGoogle.interrupted"),
        duration: 5000,
      });
      return;
    }

    const session = await serverActions.users.signInWithRedirectGoogle(
      {
        code,
        codeVerifier,
      },
      {
        404: () => onAccountNotFound(),
      },
    );

    if (session) onSignInComplete(session);
  });

  useEffect(() => {
    if (IS_SELFHOST || isElectron || isNative) return;

    const onGoogleReady = () => {
      const googleAccountsId = window.google?.accounts?.id;
      if (!googleAccountsId) return;

      googleAccountsId.initialize({
        client_id: GOOGLE_GSI_CLIENT_ID,
        context: "signin",
        ux_mode: "popup",
        callback: (response) => void afterSignInComplete(response),
        auto_prompt: "false",
      });

      const container = googleButtonContainerRef.current;
      if (showButton && container) {
        googleAccountsId.renderButton(container, {
          type: "standard",
          shape: "rectangular",
          theme: "filled_black",
          text: "continue_with",
          size: "large",
          logo_alignment: "left",
        });
      }
      if (autoPrompt) googleAccountsId.prompt();
    };

    if (window.google?.accounts) {
      onGoogleReady();
      return;
    }

    const existingNode = document.getElementById(GOOGLE_SCRIPT_NODE_ID);
    if (existingNode) {
      existingNode.addEventListener("load", onGoogleReady);
      return () => existingNode.removeEventListener("load", onGoogleReady);
    }

    const googleScriptNode = document.createElement("script");
    googleScriptNode.src = "https://accounts.google.com/gsi/client";
    googleScriptNode.async = true;
    googleScriptNode.id = GOOGLE_SCRIPT_NODE_ID;
    googleScriptNode.addEventListener("load", onGoogleReady);
    document.head.appendChild(googleScriptNode);
    return () => googleScriptNode.removeEventListener("load", onGoogleReady);
  }, [showButton, autoPrompt]);

  const startExternalGoogleSignIn = async () => {
    const codeChallenge = await createPkceChallenge(PKCE_VERIFIER_STORAGE_KEY);
    localStorage.setItem(SSO_PENDING_PROVIDER_KEY, "google");
    const url = `${serverConfig.apiBase}auth/redirect-google?allowRegistration=${allowRegistration}&codeChallenge=${encodeURIComponent(codeChallenge)}`;
    if (isNative) {
      void Browser.open({ url });
      return;
    }
    window.open(url);
  };

  return (
    <>
      <div
        className="flex justify-center"
        ref={googleButtonContainerRef}
        hidden={isElectron || isNative}
      />
      {(isElectron || isNative) && (
        <Button
          size="lg"
          className="w-full bg-neutral-900 text-white hover:bg-neutral-800"
          onClick={() => void startExternalGoogleSignIn()}
        >
          {t("components.signInWithGoogle.button")}
        </Button>
      )}
    </>
  );
};
