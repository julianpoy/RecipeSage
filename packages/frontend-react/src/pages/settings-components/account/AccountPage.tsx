import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import dayjs from "dayjs";
import {
  ChartColumnIcon,
  HeartIcon,
  KeyRoundIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Capabilities } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { showAlert } from "../../../components/dialogs/showAlert";
import { TextField } from "../../../components/forms/TextField";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { loadingService } from "../../../services/loadingService";
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { serverActions } from "../../../services/serverActions";
import { capabilitiesStore } from "../../../stores/capabilitiesStore";
import { appIdbStorageManager } from "../../../utils/appIdbStorageManager";
import { formatDate } from "../../../utils/formatDate";
import { getQueryParam } from "../../../utils/queryParams";
import {
  CapabilityStatus,
  type CapabilitySubscription,
} from "./CapabilityStatus";

type Me = RouterOutputs["users"]["getMe"];

const captureResetToken = () => {
  const resetToken = getQueryParam("token");
  if (resetToken) localStorage.setItem("token", resetToken);
  return resetToken;
};

const getSubscriptionForCapability = (
  me: Me | undefined,
  capabilityName: Capabilities,
) => {
  if (!me || !me.subscriptions) return null;

  try {
    const matchingSubscriptions = me.subscriptions
      .filter((subscription) =>
        subscription.capabilities.includes(capabilityName),
      )
      .sort((a, b) => {
        if (a.expires == null) return -1;
        if (b.expires == null) return 1;
        return new Date(b.expires).getTime() - new Date(a.expires).getTime();
      });
    if (matchingSubscriptions) return matchingSubscriptions[0];
  } catch (e) {
    console.error(e);
  }
  return null;
};

const getExpiryForCapability = (
  me: Me | undefined,
  capabilityName: Capabilities,
) => {
  const subscription = getSubscriptionForCapability(me, capabilityName);
  if (!subscription)
    return {
      expired: null,
      expires: null,
    };
  if (!subscription.expires)
    return {
      expired: false,
      expires: null,
    };

  const expires = new Date(subscription.expires);
  return {
    expired: new Date(subscription.expires) < new Date(),
    expires: dayjs(expires).format("YYYY-MM-DD"),
  };
};

const SectionTitle = ({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) => (
  <h2 className="flex items-center gap-4 px-4 py-2 text-base font-medium [&_svg]:size-5 [&_svg]:shrink-0">
    {icon}
    <span className="min-w-0 break-words">{children}</span>
  </h2>
);

const Stat = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="px-4 py-2">
    <h3>{label}</h3>
    <p className="text-sm text-muted-foreground">{value}</p>
  </div>
);

export const AccountPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [resetToken] = useState(captureResetToken);

  const meQuery = useOfflineFirstQuery(serverActions.users.getMe());
  const me = meQuery.data;
  const statsQuery = useActionQuery(["users.getMyStats"], () =>
    serverActions.users.getMyStats(),
  );
  const myStats = statsQuery.data;
  const creditUsageQuery = useActionQuery(["users.getMyCreditUsage"], () =>
    serverActions.users.getMyCreditUsage(),
  );
  const myCreditUsage = creditUsageQuery.data;
  const capabilities = capabilitiesStore((state) => state.capabilities);

  const [name, setName] = useState("");
  const [nameChanged, setNameChanged] = useState(false);
  const [email, setEmail] = useState("");
  const [emailChanged, setEmailChanged] = useState(false);
  const [password, setPassword] = useState("123456");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChanged, setPasswordChanged] = useState(false);

  const meInitializedRef = useRef(false);

  const isLoading = statsQuery.isPending || creditUsageQuery.isPending;
  useEffect(() => {
    if (!isLoading) return;
    const loading = loadingService.start();
    return () => loading.dismiss();
  }, [isLoading]);

  useEffect(() => {
    void capabilitiesStore.getState().updateCapabilities();
  }, []);

  useEffect(() => {
    if (!me || meInitializedRef.current) return;
    meInitializedRef.current = true;

    void (async () => {
      if (resetToken) {
        const lastUserId = await appIdbStorageManager.getLastSessionUserId();
        if (lastUserId !== me.id) {
          await appIdbStorageManager.deleteAllData();
        }
        await appIdbStorageManager.setSession({
          userId: me.id,
          email: me.email,
          token: resetToken,
        });
      }

      setName(me.name);
      setEmail(me.email);
    })();
  }, [me, resetToken]);

  const getCapabilitySubscription = (
    capabilityName: Capabilities,
  ): CapabilitySubscription => {
    const expiry = getExpiryForCapability(me, capabilityName);
    return {
      enabled: !!capabilities[capabilityName],
      expired: expiry.expired,
      expires: expiry.expires,
    };
  };

  const presentMessage = (message: string, header?: string) =>
    showAlert({
      header,
      message,
      buttons: [
        {
          text: t("generic.okay"),
        },
      ],
    });

  const saveName = async () => {
    if (!name.trim()) {
      void presentMessage(t("pages.account.nameRequired"), t("generic.error"));
      return;
    }

    const loading = loadingService.start();

    const response = await serverActions.users.updateUser({
      name,
    });

    loading.dismiss();
    if (!response) return;

    setNameChanged(false);

    void presentMessage(t("pages.account.nameUpdated"));
  };

  const saveEmail = async () => {
    if (!email.trim()) {
      void presentMessage(t("pages.account.emailRequired"));
      return;
    }

    const loading = loadingService.start();

    const response = await serverActions.users.updateUser(
      {
        email,
      },
      {
        400: () =>
          showAlert({
            message: t("pages.account.emailInvalid"),
            buttons: [],
          }),
        409: () =>
          showAlert({
            message: t("pages.account.emailConflict"),
            buttons: [],
          }),
      },
    );

    loading.dismiss();
    if (!response) return;

    setEmailChanged(false);

    void presentMessage(t("pages.account.emailUpdated"));
  };

  const savePassword = async () => {
    if (password !== confirmPassword) {
      void presentMessage(t("pages.account.passwordMatch"));
      return;
    }

    if (password.length < 6) {
      void presentMessage(t("pages.account.passwordLength"));
      return;
    }

    const loading = loadingService.start();

    const response = await serverActions.users.updateUser({
      password,
    });
    loading.dismiss();
    if (!response) return;

    setPassword("*".repeat(password.length));
    setPasswordChanged(false);
    setConfirmPassword("");

    localStorage.removeItem("token");
    await appIdbStorageManager.removeSession();

    await showAlert({
      header: t("pages.account.passwordUpdated.header"),
      message: t("pages.account.passwordUpdated.message"),
      buttons: [
        {
          text: t("generic.okay"),
          handler: () => {
            void navigate({
              to: "/auth/$authType",
              params: { authType: "login" },
              replace: true,
            });
          },
        },
      ],
    });
  };

  const deleteAccount = async () => {
    await showAlert({
      header: t("pages.account.deleteAccount.header"),
      message: t("pages.account.deleteAccount.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          handler: () => {},
        },
        {
          text: t("generic.delete"),
          variant: "destructive",
          handler: async () => {
            const loading = loadingService.start();

            const response = await serverActions.users.deleteUser();

            loading.dismiss();
            if (!response) return;

            localStorage.removeItem("token");
            await appIdbStorageManager.removeSession();

            void navigate({
              to: "/auth/$authType",
              params: { authType: "login" },
              replace: true,
            });
          },
        },
      ],
    });
  };

  const deleteAllRecipes = async () => {
    await showAlert({
      header: t("pages.account.deleteAllRecipes.header"),
      message: t("pages.account.deleteAllRecipes.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          handler: () => {},
        },
        {
          text: t("pages.account.deleteAllRecipes.confirm"),
          variant: "destructive",
          handler: async () => {
            const loading = loadingService.start();

            const response = await serverActions.recipes.deleteAllRecipes();

            loading.dismiss();
            if (!response) return;

            void presentMessage(
              t("pages.account.deleteAllRecipes.success"),
              t("pages.account.deleteAllRecipes.success.header"),
            );
          },
        },
      ],
    });
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/settings" }} />}
        title={t("pages.account.title")}
      />
      {me && myStats && (
        <PageContent padded={false}>
          <div className="mx-auto flex max-w-page flex-col py-4">
            <p className="px-4 py-2 text-sm text-muted-foreground">
              {t("pages.account.description")}
            </p>

            <div className="mt-6">
              <SectionTitle icon={<KeyRoundIcon aria-hidden="true" />}>
                {t("pages.account.creds.title")}
              </SectionTitle>
              <div className="flex flex-col gap-4 px-4 py-2">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <TextField
                      label={t("pages.account.creds.name")}
                      autoComplete="off"
                      type="text"
                      value={name}
                      onFocus={() => setNameChanged(true)}
                      onValueChange={(value) => {
                        setName(value);
                        setNameChanged(true);
                      }}
                    />
                  </div>
                  {nameChanged && (
                    <Button size="lg" onClick={() => void saveName()}>
                      {t("pages.account.creds.name.save")}
                    </Button>
                  )}
                </div>
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <TextField
                      label={t("pages.account.creds.email")}
                      autoComplete="off"
                      type="email"
                      value={email}
                      onFocus={() => setEmailChanged(true)}
                      onValueChange={(value) => {
                        setEmail(value);
                        setEmailChanged(true);
                      }}
                    />
                  </div>
                  {emailChanged && (
                    <Button size="lg" onClick={() => void saveEmail()}>
                      {t("pages.account.creds.email.save")}
                    </Button>
                  )}
                </div>
                <TextField
                  label={t("pages.account.creds.password")}
                  autoComplete="new-password"
                  type="password"
                  value={password}
                  onFocus={() => {
                    setPassword("");
                    setPasswordChanged(true);
                  }}
                  onValueChange={(value) => {
                    setPassword(value);
                    setPasswordChanged(true);
                  }}
                />
                {passwordChanged && (
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1">
                      <TextField
                        label={t("pages.account.creds.password.confirm")}
                        autoComplete="new-password"
                        type="password"
                        value={confirmPassword}
                        onValueChange={setConfirmPassword}
                      />
                    </div>
                    <Button size="lg" onClick={() => void savePassword()}>
                      {t("pages.account.creds.password.save")}
                    </Button>
                  </div>
                )}
              </div>
              <p className="px-4 pt-4 text-sm text-muted-foreground">
                {t("pages.account.creds.instructions")}
              </p>
            </div>

            <div className="mt-10">
              <SectionTitle icon={<ChartColumnIcon aria-hidden="true" />}>
                {t("pages.account.stats.title")}
              </SectionTitle>
              <Stat
                label={t("pages.account.stats.recipeCount")}
                value={myStats.recipeCount}
              />
              <Stat
                label={t("pages.account.stats.recipeImageCount")}
                value={myStats.recipeImageCount}
              />
              <Stat
                label={t("pages.account.stats.messageCount")}
                value={myStats.messageCount}
              />
              <Stat
                label={t("pages.account.stats.createdAt")}
                value={formatDate(myStats.createdAt, { now: true })}
              />
              <Stat
                label={t("pages.account.stats.lastLogin")}
                value={formatDate(myStats.lastLogin || myStats.createdAt, {
                  now: true,
                })}
              />
            </div>

            <div className="mt-10">
              <SectionTitle icon={<HeartIcon aria-hidden="true" />}>
                {t("pages.account.bonus.title")}
              </SectionTitle>
              <p className="px-4 py-2 text-sm">
                <Link
                  to="/contribute"
                  state={{ showBack: true }}
                  className="text-primary hover:underline"
                >
                  {t("pages.account.bonus.description")}
                </Link>
              </p>
              <CapabilityStatus
                title={t("pages.account.bonus.highResImages")}
                subscription={getCapabilitySubscription(
                  Capabilities.HighResImages,
                )}
              />
              <CapabilityStatus
                title={t("pages.account.bonus.multipleImages")}
                subscription={getCapabilitySubscription(
                  Capabilities.MultipleImages,
                )}
              />
              <CapabilityStatus
                title={t("pages.account.bonus.assistantMoreMessages")}
                subscription={getCapabilitySubscription(
                  Capabilities.AssistantMoreMessages,
                )}
              />
              <CapabilityStatus
                title={t("pages.account.bonus.moreUsageCredits")}
                subscription={getCapabilitySubscription(
                  Capabilities.MoreUsageCredits,
                )}
              >
                {myCreditUsage &&
                  (myCreditUsage.unlimited ? (
                    <p>{t("pages.account.credits.selfhostNotApplicable")}</p>
                  ) : (
                    <p>
                      {t("pages.account.credits.usageValue", {
                        used: myCreditUsage.used,
                        limit: myCreditUsage.limit,
                      })}
                    </p>
                  ))}
              </CapabilityStatus>
            </div>

            <div className="mt-10">
              <SectionTitle
                icon={
                  <TriangleAlertIcon
                    aria-hidden="true"
                    className="text-destructive"
                  />
                }
              >
                {t("pages.account.dangerZone.title")}
              </SectionTitle>
              <p className="px-4 py-2 text-sm text-muted-foreground">
                {t("pages.account.dangerZone.warning1")}
                <br />
                {t("pages.account.dangerZone.warning2")}
              </p>
              <div className="flex flex-col items-start gap-4 px-4 pt-4">
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => void deleteAllRecipes()}
                >
                  {t("pages.account.dangerZone.deleteAllRecipes")}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  onClick={() => void deleteAccount()}
                >
                  {t("pages.account.dangerZone.deleteAccount")}
                </Button>
              </div>
              <p className="px-4 py-4 text-sm text-muted-foreground">
                {t("pages.account.dangerZone.description")}
              </p>
            </div>
          </div>
        </PageContent>
      )}
    </>
  );
};
