import { useState, type KeyboardEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import type { SessionDTO } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { InputGroupButton } from "@/components/ui/input-group";
import { IS_SELFHOST } from "../../environments/environment";
import { PageHeader } from "../../components/layout/PageHeader";
import { PageContent } from "../../components/layout/PageContent";
import { BackButton } from "../../components/layout/BackButton";
import { TextField } from "../../components/forms/TextField";
import { LogoIcon } from "../../components/LogoIcon";
import { TosClickwrapAgreement } from "../../components/TosClickwrapAgreement";
import { SignInWithGoogle } from "../../components/sso/SignInWithGoogle";
import { SignInWithApple } from "../../components/sso/SignInWithApple";
import { showAlert } from "../../components/dialogs/showAlert";
import { i18n } from "../../i18n/i18n";
import type { TranslationKey } from "../../i18n/TranslationKey";
import { EventName, events } from "../../services/events";
import { loadingService } from "../../services/loadingService";
import { messagingService } from "../../services/messagingService";
import { serverActions } from "../../services/serverActions";
import { swCommunicationService } from "../../services/swCommunicationService";
import { websocketService } from "../../services/websocketService";
import { appIdbStorageManager } from "../../utils/appIdbStorageManager";

const presentAlert = (headerKey: TranslationKey, messageKey: TranslationKey) =>
  showAlert({
    header: i18n.t(headerKey),
    message: i18n.t(messageKey),
    buttons: [
      {
        text: i18n.t("generic.okay"),
      },
    ],
  });

export const AuthView = ({
  startWithRegister,
  redirect,
  showBack = false,
  modal,
}: {
  startWithRegister: boolean;
  redirect?: string;
  showBack?: boolean;
  modal?: {
    close: () => void;
  };
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [showLogin, setShowLogin] = useState(!startWithRegister);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revealPassword, setRevealPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const isInModal = !!modal;

  const close = () => {
    if (modal) {
      modal.close();
      return;
    }

    if (redirect) {
      void navigate({ href: redirect, replace: true });
      return;
    }
    void navigate({
      to: "/list/$folder",
      params: { folder: "main" },
      replace: true,
    });
  };

  const finishAuth = (isNewUser?: boolean) => {
    events.publish(EventName.Auth);

    if (isNewUser && !IS_SELFHOST && !isInModal) {
      void navigate({ to: "/welcome-flow", replace: true });
      return;
    }

    close();
  };

  const completeSession = async (session: SessionDTO) => {
    localStorage.setItem("token", session.token);
    const lastUserId = await appIdbStorageManager.getLastSessionUserId();
    if (lastUserId !== session.userId) {
      await appIdbStorageManager.deleteAllData();
    }
    await appIdbStorageManager.setSession(session);
    void swCommunicationService.triggerFullCacheSync();

    void websocketService.triggerReconnect();

    if ("Notification" in window && Notification.permission === "granted") {
      void messagingService.requestNotifications();
    }

    finishAuth(session.isNewUser);
  };

  const auth = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!showLogin && !emailRegex.test(email)) {
      void presentAlert("generic.error", "pages.auth.error.invalidEmail");
      return;
    }
    if (!showLogin && name.length < 1) {
      void presentAlert("generic.error", "pages.auth.error.noName");
      return;
    }
    if (password.length === 0) {
      void presentAlert("generic.error", "pages.auth.error.noPassword");
      return;
    }
    if (!showLogin && password.length < 6) {
      void presentAlert("generic.error", "pages.auth.error.passwordLength");
      return;
    }
    if (email.length === 0) {
      void presentAlert("generic.error", "pages.auth.error.noEmail");
      return;
    }
    if (!showLogin && password !== confirmPassword) {
      void presentAlert("generic.error", "pages.auth.error.passwordMatch");
      return;
    }

    const loadingRef = loadingService.start();
    setLoading(true);

    const response = showLogin
      ? await serverActions.users.login(
          {
            email,
            password,
          },
          {
            403: () =>
              presentAlert(
                "generic.error",
                "pages.auth.error.incorrectPassword",
              ),
            404: () =>
              presentAlert("generic.error", "pages.auth.error.incorrectEmail"),
            409: () =>
              presentAlert("generic.error", "pages.auth.error.ssoAccount"),
          },
        )
      : await serverActions.users.register(
          {
            name,
            email,
            password,
          },
          {
            400: () =>
              presentAlert(
                "generic.error",
                "pages.auth.error.invalidEmailPassword",
              ),
            403: () =>
              presentAlert(
                "generic.error",
                "pages.auth.error.registrationDisabled",
              ),
            409: () =>
              presentAlert("generic.error", "pages.auth.error.emailTaken"),
          },
        );
    loadingRef.dismiss();
    setLoading(false);
    if (!response) return;

    await completeSession(response);
  };

  const onSsoAccountNotFound = () => {
    void presentAlert("generic.error", "pages.auth.error.incorrectEmail");
  };

  const forgotPassword = async () => {
    if (!email) {
      await presentAlert("generic.error", "pages.auth.error.invalidEmail");
      return;
    }

    const loadingRef = loadingService.start();

    const response = await serverActions.users.forgotPassword(
      {
        email,
      },
      {
        404: () =>
          presentAlert("generic.error", "pages.auth.error.incorrectEmail"),
      },
    );

    loadingRef.dismiss();

    if (!response) return;

    await presentAlert(
      "pages.auth.forgot.alert.header",
      "pages.auth.forgot.alert.message",
    );
  };

  const logout = async () => {
    localStorage.removeItem("token");
    await appIdbStorageManager.deleteAllData();

    void navigate({
      to: "/auth/$authType",
      params: { authType: "login" },
      replace: true,
    });

    modal?.close();
  };

  const onEnter =
    (shouldSubmit: boolean) => (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter" && shouldSubmit) void auth();
    };

  const revealPasswordButton = (
    <InputGroupButton
      size="icon-sm"
      aria-label={t("pages.auth.showHidePassword")}
      onClick={() => setRevealPassword((prev) => !prev)}
    >
      {revealPassword ? (
        <EyeOffIcon className="text-muted-foreground" aria-hidden="true" />
      ) : (
        <EyeIcon className="text-muted-foreground" aria-hidden="true" />
      )}
    </InputGroupButton>
  );

  let headerStart;
  if (isInModal) {
    headerStart = (
      <Button
        variant="ghost"
        size="icon-lg"
        className="text-inherit hover:bg-white/10 hover:text-inherit"
        aria-label={t("generic.close")}
        onClick={() => void logout()}
      >
        <XIcon className="size-6" />
      </Button>
    );
  } else if (showBack) {
    headerStart = <BackButton fallback={{ to: "/get-started" }} />;
  }

  return (
    <>
      <PageHeader
        start={headerStart}
        title={
          showLogin
            ? t("pages.auth.title.login")
            : t("pages.auth.title.register")
        }
      />
      <PageContent>
        <div className="mx-auto flex max-w-content flex-col gap-4">
          <div className="flex flex-col gap-4 pt-4 pb-12">
            {IS_SELFHOST ? (
              <div>{t("pages.auth.selfhostWarning")}</div>
            ) : (
              <LogoIcon noBg />
            )}
            {showLogin ? (
              <div className="text-center">
                <h2 className="text-2xl font-semibold">
                  {t("pages.auth.welcome.login")}
                </h2>
                <span>{t("pages.auth.welcome.login.sub")}</span>
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-2xl font-semibold">
                  {t("pages.auth.welcome.register")}
                </h2>
                <span>{t("pages.auth.welcome.register.sub1")}</span>
                <br />
                <span>{t("pages.auth.welcome.register.sub2")}</span>
              </div>
            )}
          </div>

          {!showLogin && (
            <TextField
              label={t("pages.auth.input.name")}
              value={name}
              onValueChange={setName}
              type="text"
              autoComplete="name"
            />
          )}

          <TextField
            label={t("pages.auth.input.email")}
            value={email}
            onValueChange={setEmail}
            type="email"
            autoComplete="email"
          />

          <TextField
            label={t("pages.auth.input.password")}
            value={password}
            onValueChange={setPassword}
            type={revealPassword ? "text" : "password"}
            autoComplete={showLogin ? "current-password" : "new-password"}
            onKeyUp={onEnter(showLogin)}
            end={revealPasswordButton}
          />

          {!showLogin && (
            <TextField
              label={t("pages.auth.input.confirmPassword")}
              value={confirmPassword}
              onValueChange={setConfirmPassword}
              type={revealPassword ? "text" : "password"}
              autoComplete="new-password"
              onKeyUp={onEnter(true)}
              end={revealPasswordButton}
            />
          )}

          {IS_SELFHOST ? (
            <div>{t("pages.auth.selfhostWarning2")}</div>
          ) : (
            <TosClickwrapAgreement onNavigate={modal?.close} />
          )}

          <Button
            size="lg"
            className="w-full"
            disabled={loading}
            onClick={() => void auth()}
          >
            {showLogin
              ? t("pages.auth.button.login")
              : t("pages.auth.button.register")}
          </Button>

          {!IS_SELFHOST && (
            <>
              <div className="flex items-center justify-center gap-5">
                <div className="w-[200px] border-b border-foreground" />
                <p className="text-center">{t("pages.auth.or")}</p>
                <div className="w-[200px] border-b border-foreground" />
              </div>
              <div className="px-4 pb-4">
                <SignInWithGoogle
                  allowRegistration={!showLogin}
                  onAccountNotFound={onSsoAccountNotFound}
                  onSignInComplete={(session) => void completeSession(session)}
                />
                <SignInWithApple
                  allowRegistration={!showLogin}
                  onAccountNotFound={onSsoAccountNotFound}
                  onSignInComplete={(session) => void completeSession(session)}
                />
              </div>
            </>
          )}

          {showLogin && (
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-primary"
              onClick={() => void forgotPassword()}
            >
              {t("pages.auth.button.forgotPassword")}
            </Button>
          )}

          <Button
            variant="ghost"
            size="lg"
            className="w-full text-primary"
            onClick={() => setShowLogin((prev) => !prev)}
          >
            {showLogin
              ? t("pages.auth.button.registerInstead")
              : t("pages.auth.button.loginInstead")}
          </Button>
        </div>
      </PageContent>
    </>
  );
};
