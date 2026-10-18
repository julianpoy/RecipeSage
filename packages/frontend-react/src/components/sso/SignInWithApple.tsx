import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { AppleSignIn, SignInScope } from "@capawesome/capacitor-apple-sign-in";
import type { SessionDTO } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import {
  APPLE_SIGN_IN_SERVICES_ID,
  IS_SELFHOST,
} from "../../environments/environment";
import { serverActions } from "../../services/serverActions";
import { getIsElectron } from "../../utils/electron";
import { serverConfig } from "../../utils/serverConfig";
import { SSO_PENDING_PROVIDER_KEY } from "../../utils/ssoRedirect";
import { i18n } from "../../i18n/i18n";
import { showToast } from "../dialogs/showToast";
import { base64UrlEncode, createPkceChallenge } from "./createPkceChallenge";
import { useSsoRedirectCode } from "./useSsoRedirectCode";

const PKCE_VERIFIER_STORAGE_KEY = "appleSignInPkceVerifier";
const APPLE_SCRIPT_NODE_ID = "apple-auth-script";

const isElectron = getIsElectron();
const isNative = Capacitor.isNativePlatform();
const isIos = Capacitor.getPlatform() === "ios";

const AppleLogo = () => (
  <svg viewBox="0 0 512 512" fill="currentColor" aria-hidden="true">
    <path d="M349.13 136.86c-40.32 0-57.36 19.24-85.44 19.24-28.79 0-50.75-19.1-85.69-19.1-34.2 0-70.67 20.88-93.83 56.45-32.52 50.16-27 144.63 25.67 225.11 18.84 28.81 44 61.12 77 61.47h.6c28.68 0 37.2-18.78 76.67-19h.6c38.88 0 46.68 18.89 75.24 18.89h.6c33-.35 59.51-36.15 78.35-64.85 13.56-20.64 18.6-31 29-54.35-76.19-28.92-88.43-136.93-13.08-178.34-23-28.8-55.32-45.48-85.79-45.48Z" />
    <path d="M340.25 32c-24 1.63-52 16.91-68.4 36.86-14.88 18.08-27.12 44.9-22.32 70.91h1.92c25.56 0 51.72-15.39 67-35.11 14.72-18.77 25.88-45.37 21.8-72.66" />
  </svg>
);

const extractName = (user?: {
  name?: { firstName?: string; lastName?: string };
}): string | undefined => {
  const fullName = [user?.name?.firstName, user?.name?.lastName]
    .filter((part): part is string => !!part)
    .join(" ");
  return fullName || undefined;
};

const isUserCancellation = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;
  return "code" in error && error.code === "SIGN_IN_CANCELED";
};

const presentSignInFailed = () => {
  showToast({
    message: i18n.t("components.signInWithApple.failed"),
    duration: 5000,
  });
};

export const SignInWithApple = ({
  allowRegistration = false,
  onSignInComplete,
  onAccountNotFound,
}: {
  allowRegistration?: boolean;
  onSignInComplete: (session: SessionDTO) => void;
  onAccountNotFound: () => void;
}) => {
  const { t } = useTranslation();

  const afterIdentityToken = async (args: {
    identityToken: string;
    nonce: string | undefined;
    name: string | undefined;
    authorizationCode: string | undefined;
    redirectUri: string | undefined;
  }) => {
    const session = await serverActions.users.signInWithApple(
      {
        ...args,
        allowRegistration,
      },
      {
        404: () => onAccountNotFound(),
      },
    );

    if (session) onSignInComplete(session);
  };

  useSsoRedirectCode(async (code) => {
    if (localStorage.getItem(SSO_PENDING_PROVIDER_KEY) !== "apple") return;
    localStorage.removeItem(SSO_PENDING_PROVIDER_KEY);

    const codeVerifier = localStorage.getItem(PKCE_VERIFIER_STORAGE_KEY);
    localStorage.removeItem(PKCE_VERIFIER_STORAGE_KEY);
    if (!codeVerifier) {
      showToast({
        message: i18n.t("components.signInWithApple.interrupted"),
        duration: 5000,
      });
      return;
    }

    const session = await serverActions.users.signInWithRedirectApple(
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

    const onAppleReady = () => {
      window.AppleID?.auth.init({
        clientId: APPLE_SIGN_IN_SERVICES_ID,
        scope: "name email",
        redirectURI: self.location.origin,
        usePopup: true,
      });
    };

    if (window.AppleID) {
      onAppleReady();
      return;
    }

    const existingNode = document.getElementById(APPLE_SCRIPT_NODE_ID);
    if (existingNode) {
      existingNode.addEventListener("load", onAppleReady);
      return () => existingNode.removeEventListener("load", onAppleReady);
    }

    const appleScriptNode = document.createElement("script");
    appleScriptNode.src =
      "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js";
    appleScriptNode.async = true;
    appleScriptNode.id = APPLE_SCRIPT_NODE_ID;
    appleScriptNode.addEventListener("load", onAppleReady);
    document.head.appendChild(appleScriptNode);
    return () => appleScriptNode.removeEventListener("load", onAppleReady);
  }, []);

  const startNativeAppleSignIn = async () => {
    const nonce = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
    try {
      const result = await AppleSignIn.signIn({
        scopes: [SignInScope.Email, SignInScope.FullName],
        nonce,
      });
      const identityToken = result.idToken;
      if (!identityToken) return;
      const name = [result.givenName, result.familyName]
        .filter((part): part is string => !!part)
        .join(" ");
      await afterIdentityToken({
        identityToken,
        nonce,
        name: name || undefined,
        authorizationCode: result.authorizationCode,
        redirectUri: undefined,
      });
    } catch (error) {
      if (isUserCancellation(error)) return;
      presentSignInFailed();
    }
  };

  const startWebAppleSignIn = async () => {
    try {
      const data = await window.AppleID?.auth.signIn();
      const identityToken = data?.authorization?.id_token;
      if (!identityToken) return;
      await afterIdentityToken({
        identityToken,
        nonce: undefined,
        name: extractName(data?.user),
        authorizationCode: data?.authorization?.code,
        redirectUri: self.location.origin,
      });
    } catch (error) {
      if (isUserCancellation(error)) return;
      presentSignInFailed();
    }
  };

  const startExternalAppleSignIn = async () => {
    const codeChallenge = await createPkceChallenge(PKCE_VERIFIER_STORAGE_KEY);
    localStorage.setItem(SSO_PENDING_PROVIDER_KEY, "apple");
    const url = `${serverConfig.apiBase}auth/redirect-apple?allowRegistration=${allowRegistration}&codeChallenge=${encodeURIComponent(codeChallenge)}`;
    if (isNative) {
      void Browser.open({ url });
      return;
    }
    window.open(url);
  };

  const onAppleButtonClick = () => {
    if (isIos) {
      void startNativeAppleSignIn();
      return;
    }
    if (isNative || isElectron) {
      void startExternalAppleSignIn();
      return;
    }
    void startWebAppleSignIn();
  };

  if (IS_SELFHOST) return null;

  return (
    <Button
      size="lg"
      className="mt-2 w-full bg-black text-white hover:bg-neutral-800"
      onClick={onAppleButtonClick}
    >
      <AppleLogo />
      {t("components.signInWithApple.button")}
    </Button>
  );
};
