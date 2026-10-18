import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Capacitor } from "@capacitor/core";
import type { Product } from "@capgo/native-purchases";
import { ArrowRightIcon } from "lucide-react";
import { SubscriptionPlatform } from "@recipesage/util/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { IS_SELFHOST } from "../../../environments/environment";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { BackButton } from "../../../components/layout/BackButton";
import { LogoIcon } from "../../../components/LogoIcon";
import { TosClickwrapAgreement } from "../../../components/TosClickwrapAgreement";
import { showAlert } from "../../../components/dialogs/showAlert";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { useIsLoggedIn } from "../../../hooks/useIsLoggedIn";
import { i18n } from "../../../i18n/i18n";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { iapService, type IapOfferings } from "../../../services/iapService";
import { serverActions } from "../../../services/serverActions";
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { capabilitiesStore } from "../../../stores/capabilitiesStore";
import { appIdbStorageManager } from "../../../utils/appIdbStorageManager";
import { buildPublicRoutePath } from "../../../utils/buildPublicRoutePath";
import { serverConfig } from "../../../utils/serverConfig";
import { session } from "../../../utils/session";

const BILLING_PORTAL_URL =
  "https://billing.stripe.com/p/login/dR6aFm6ex5vuauk8ww";

const APPLE_MANAGE_URL = "https://apps.apple.com/account/subscriptions";
const GOOGLE_MANAGE_URL = "https://play.google.com/store/account/subscriptions";

type Frequency = "monthly" | "yearly" | "single";
type NativeFrequency = "monthly" | "yearly";

const AMOUNTS_BY_FREQUENCY: Record<Frequency, number[]> = {
  monthly: [1, 5, 10],
  yearly: [12, 50, 100],
  single: [15, 50, 100],
};

const isSelfhostRedirect = IS_SELFHOST || serverConfig.preset === "custom";

const presentAlert = async (
  headerKey: TranslationKey,
  messageKey: TranslationKey,
  messageParams?: Record<string, unknown>,
) => {
  await showAlert({
    header: i18n.t(headerKey),
    message: i18n.t(messageKey, messageParams),
    buttons: [
      {
        text: i18n.t("generic.okay"),
      },
    ],
  });
};

const buildBillingPortalUrl = async () => {
  const url = new URL(BILLING_PORTAL_URL);

  const currentSession = await appIdbStorageManager.getSession();
  if (currentSession?.email) {
    url.searchParams.set(
      "prefilled_email",
      encodeURIComponent(currentSession.email),
    );
  }

  return url.toString();
};

const sortProducts = (products: Product[]) =>
  [...products].sort((a, b) => a.price - b.price);

const getActiveSubscriptionPlatforms = (
  subscriptions: RouterOutputs["users"]["getMe"]["subscriptions"],
) => {
  const now = Date.now();
  return [
    ...new Set(
      subscriptions
        .filter(
          (subscription) =>
            subscription.expires === null ||
            new Date(subscription.expires).getTime() > now,
        )
        .map((subscription) => subscription.platform),
    ),
  ];
};

const LINK_CLASSES = "text-primary underline-offset-4 hover:underline";

export const ContributePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();
  const capabilities = capabilitiesStore((state) => state.capabilities);
  const showBack = useLocation({
    select: (location) => !!location.state.showBack,
  });

  const meQuery = useOfflineFirstQuery(
    serverActions.users.getMe({ 401: () => {} }),
    { enabled: isLoggedIn },
  );
  const me = meQuery.data;

  const isNative = Capacitor.isNativePlatform();

  const [billingPortalUrl, setBillingPortalUrl] = useState(BILLING_PORTAL_URL);
  const [frequency, setFrequency] = useState<Frequency>();
  const [amount, setAmount] = useState<number>();
  const [customAmount, setCustomAmount] = useState<string>();
  const [nativeFrequency, setNativeFrequency] =
    useState<NativeFrequency>("monthly");
  const [nativeOfferings, setNativeOfferings] = useState<IapOfferings>();
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const purchasingRef = useRef(false);

  useEffect(() => {
    if (isSelfhostRedirect) {
      window.alert(i18n.t("pages.contribute.selfhostRedirect"));
      window.location.href = "https://recipesage.com/app/contribute";
      return;
    }

    void capabilitiesStore.getState().updateCapabilities();

    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;
    const loadNativeOfferings = async () => {
      setLoadingProducts(true);
      try {
        const offerings = await iapService.getOfferings();
        if (!cancelled) setNativeOfferings(offerings);
      } catch (e) {
        console.error("Failed to load contribution offerings", e);
      } finally {
        if (!cancelled) setLoadingProducts(false);
      }
    };
    void loadNativeOfferings();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void buildBillingPortalUrl().then((url) => {
      if (!cancelled) setBillingPortalUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const nativeProducts = nativeOfferings
    ? sortProducts(
        nativeFrequency === "monthly"
          ? nativeOfferings.monthly
          : nativeOfferings.yearly,
      )
    : [];

  const activeSubscriptionPlatforms = me
    ? getActiveSubscriptionPlatforms(me.subscriptions)
    : [];

  const hasActiveSubscription = activeSubscriptionPlatforms.length > 0;
  const hasAppleSubscription = activeSubscriptionPlatforms.includes(
    SubscriptionPlatform.Apple,
  );
  const hasGoogleSubscription = activeSubscriptionPlatforms.includes(
    SubscriptionPlatform.Google,
  );
  const hasStripeSubscription = activeSubscriptionPlatforms.includes(
    SubscriptionPlatform.Stripe,
  );
  const hasStoreSubscription = hasAppleSubscription || hasGoogleSubscription;
  const showStripePortal = !hasStoreSubscription || hasStripeSubscription;
  const subscriptionInfoLoaded = !isLoggedIn || !meQuery.isPending;

  const selectAmount = (newAmount: number) => {
    setAmount(newAmount);
    setCustomAmount(undefined);
  };

  const focusCustom = () => {
    setAmount(undefined);
    setCustomAmount("0.00");
  };

  const selectFrequency = (newFrequency: Frequency) => {
    setFrequency(newFrequency);
    setAmount(undefined);
    setCustomAmount(undefined);
  };

  const validAmount = () => {
    if (amount) return true;
    if (!customAmount) return false;

    return !!parseFloat(customAmount);
  };

  const contribute = async () => {
    if (!frequency) return;

    let contributionAmount = 0;
    if (amount) contributionAmount = amount;
    else if (customAmount) contributionAmount = parseFloat(customAmount);
    else return;

    const minimumAmount = frequency === "monthly" ? 1 : 10;

    const response = await serverActions.payments.createStripeCheckoutSession(
      {
        amount: contributionAmount * 100,
        frequency,
        successUrl: buildPublicRoutePath("contribute/thankyou"),
        cancelUrl: buildPublicRoutePath("contribute/cancel"),
      },
      {
        412: async () => {
          await presentAlert("generic.error", "pages.contribute.minimum", {
            amount: minimumAmount,
          });
        },
      },
    );
    if (!response || !response.url) return;

    window.location.href = response.url;
  };

  const requireLogin = async () => {
    if (session.isLoggedIn()) return true;

    await showAlert({
      header: t("pages.contribute.native.loginRequiredHeader"),
      message: t("pages.contribute.native.loginRequired"),
      buttons: [
        {
          text: t("generic.okay"),
          handler: () => {
            void navigate({
              to: "/auth/$authType",
              params: { authType: "login" },
            });
          },
        },
      ],
    });

    return false;
  };

  const purchaseNative = async (product: Product) => {
    if (purchasingRef.current) return;
    if (!(await requireLogin())) return;
    purchasingRef.current = true;
    setPurchasing(true);

    try {
      const granted = await iapService.purchase(product);
      await meQuery.refetch();
      if (granted) {
        void navigate({ to: "/contribute/thankyou" });
      } else {
        await presentAlert(
          "pages.contribute.native.notActivatedHeader",
          "pages.contribute.native.notActivated",
        );
      }
    } catch (e) {
      console.error("Native purchase did not complete", e);
    } finally {
      purchasingRef.current = false;
      setPurchasing(false);
    }
  };

  const restoreNative = async () => {
    if (purchasingRef.current) return;
    if (!(await requireLogin())) return;
    purchasingRef.current = true;
    setPurchasing(true);

    try {
      const granted = await iapService.restore();
      await meQuery.refetch();
      if (granted > 0) {
        await presentAlert(
          "pages.contribute.native.restoredHeader",
          "pages.contribute.native.restored",
        );
      } else {
        await presentAlert(
          "pages.contribute.native.noPurchasesHeader",
          "pages.contribute.native.noPurchases",
        );
      }
    } catch (e) {
      console.error("Restore purchases failed", e);
      await presentAlert("generic.error", "pages.contribute.native.error");
    } finally {
      purchasingRef.current = false;
      setPurchasing(false);
    }
  };

  const manageNative = async () => {
    try {
      await iapService.manageSubscriptions();
    } catch (e) {
      console.error("Open manage subscriptions failed", e);
    }
  };

  const frequencyButton = (value: Frequency, label: string) => (
    <Button
      size="lg"
      variant={frequency === value ? "default" : "outline"}
      onClick={() => selectFrequency(value)}
    >
      {label}
    </Button>
  );

  const nativeFrequencyButton = (value: NativeFrequency, label: string) => (
    <Button
      size="lg"
      variant={nativeFrequency === value ? "default" : "outline"}
      onClick={() => setNativeFrequency(value)}
    >
      {label}
    </Button>
  );

  const spinner = (
    <div className="flex justify-center py-2">
      <Spinner className="size-6" />
    </div>
  );

  const bonusFeature = (label: string, enabled: boolean) => (
    <li className="leading-[22px]">
      {label}
      {enabled && (
        <Badge className="ms-2 align-middle">
          {t("pages.contribute.bonus.enabled")}
        </Badge>
      )}
    </li>
  );

  return (
    <>
      <PageHeader
        start={
          showBack ? <BackButton fallback={{ to: "/about" }} /> : undefined
        }
        title={t("pages.contribute.title")}
      />
      <PageContent>
        <p className="mt-4 text-center text-2xl">
          {t("pages.contribute.subtitle")}
        </p>

        <div className="mx-auto mt-12 flex max-w-content flex-col gap-4 text-sm">
          <Link to="/about" aria-label={t("pages.about.title")}>
            <LogoIcon />
          </Link>

          <p>{t("pages.contribute.mission")}</p>
          <p>{t("pages.contribute.purpose")}</p>

          <div className="py-2">
            {!subscriptionInfoLoaded && spinner}

            {subscriptionInfoLoaded && !isNative && hasStoreSubscription && (
              <p className="text-center">
                {t("pages.contribute.native.storeManaged")}
              </p>
            )}

            {subscriptionInfoLoaded && !isNative && !hasStoreSubscription && (
              <>
                <div className="flex flex-wrap justify-center gap-2">
                  {frequencyButton("monthly", t("pages.contribute.monthly"))}
                  {frequencyButton("yearly", t("pages.contribute.yearly"))}
                  {frequencyButton("single", t("pages.contribute.oneTime"))}
                </div>

                {frequency && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {AMOUNTS_BY_FREQUENCY[frequency].map((presetAmount) => (
                      <Button
                        key={presetAmount}
                        size="lg"
                        variant={
                          amount === presetAmount ? "default" : "outline"
                        }
                        onClick={() => selectAmount(presetAmount)}
                      >
                        ${presetAmount.toFixed(2)}
                      </Button>
                    ))}
                    <input
                      className="h-9 w-24 rounded-2xl border border-border bg-transparent px-2 text-center outline-none focus:border-primary"
                      inputMode="decimal"
                      placeholder={t("pages.contribute.custom")}
                      aria-label={t("pages.contribute.custom")}
                      value={customAmount ?? ""}
                      onFocus={focusCustom}
                      onChange={(event) => setCustomAmount(event.target.value)}
                    />
                  </div>
                )}

                {frequency && (
                  <div className="mt-5 flex flex-col items-center gap-4 text-center">
                    <Button
                      size="lg"
                      disabled={!validAmount()}
                      onClick={() => void contribute()}
                    >
                      {t("pages.contribute.action")}
                      <ArrowRightIcon
                        data-icon="inline-end"
                        className="rtl:rotate-180"
                      />
                    </Button>
                    <TosClickwrapAgreement />
                  </div>
                )}
              </>
            )}

            {subscriptionInfoLoaded && isNative && hasActiveSubscription && (
              <p className="text-center">
                {t("pages.contribute.native.alreadySubscribed")}
              </p>
            )}

            {subscriptionInfoLoaded && isNative && !hasActiveSubscription && (
              <>
                <div className="flex flex-wrap justify-center gap-2">
                  {nativeFrequencyButton(
                    "monthly",
                    t("pages.contribute.monthly"),
                  )}
                  {nativeFrequencyButton(
                    "yearly",
                    t("pages.contribute.yearly"),
                  )}
                </div>

                {loadingProducts && spinner}
                {!loadingProducts && nativeProducts.length === 0 && (
                  <p className="mt-5 text-center">
                    {t("pages.contribute.native.unavailable")}
                  </p>
                )}
                {!loadingProducts && nativeProducts.length > 0 && (
                  <div className="mx-auto mt-5 flex max-w-[400px] flex-col gap-2">
                    {nativeProducts.map((product) => (
                      <Button
                        key={product.offerToken ?? product.identifier}
                        size="lg"
                        className="h-auto min-h-12 w-full py-3 whitespace-normal"
                        disabled={purchasing}
                        onClick={() => void purchaseNative(product)}
                      >
                        <span className="grow text-start">{product.title}</span>
                        <span className="ms-4 shrink-0 font-semibold">
                          {product.priceString}
                        </span>
                      </Button>
                    ))}
                  </div>
                )}

                <div className="mt-5 flex flex-col items-center gap-2 text-center">
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-primary"
                    disabled={purchasing}
                    onClick={() => void restoreNative()}
                  >
                    {t("pages.contribute.native.restore")}
                  </Button>
                  <TosClickwrapAgreement />
                </div>
              </>
            )}
          </div>

          <p>{t("pages.contribute.bonus.title")}</p>

          <ul className="list-disc ps-10">
            {bonusFeature(
              t("pages.contribute.bonus.feature.1"),
              capabilities.highResImages,
            )}
            {bonusFeature(
              t("pages.contribute.bonus.feature.2"),
              capabilities.multipleImages,
            )}
            {bonusFeature(
              t("pages.contribute.bonus.feature.3"),
              capabilities.assistantMoreMessages,
            )}
            {bonusFeature(
              t("pages.contribute.bonus.feature.4"),
              capabilities.moreUsageCredits,
            )}
          </ul>

          <p>
            <i>{t("pages.contribute.yearlyMonthly")}: </i>
            {t("pages.contribute.yearlyMonthly.description")}
            <br />
            <i>{t("pages.contribute.oneTime")}: </i>
            {t("pages.contribute.oneTime.description")}
          </p>
          <p>{t("pages.contribute.bonus.reason")}</p>
          <p>{t("pages.contribute.cta.1")}</p>
          <p>{t("pages.contribute.cta.2")}</p>

          <div className="mt-12 flex flex-col gap-4 pb-6">
            {subscriptionInfoLoaded && !isNative && (
              <>
                {showStripePortal && (
                  <p>
                    <a
                      href={billingPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LINK_CLASSES}
                    >
                      {t("pages.contribute.manage")}
                    </a>
                  </p>
                )}
                {hasAppleSubscription && (
                  <p>
                    <a
                      href={APPLE_MANAGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LINK_CLASSES}
                    >
                      {t("pages.contribute.native.manageApple")}
                    </a>
                  </p>
                )}
                {hasGoogleSubscription && (
                  <p>
                    <a
                      href={GOOGLE_MANAGE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LINK_CLASSES}
                    >
                      {t("pages.contribute.native.manageGoogle")}
                    </a>
                  </p>
                )}
              </>
            )}
            {subscriptionInfoLoaded && isNative && (
              <>
                {(hasAppleSubscription || hasGoogleSubscription) && (
                  <p>
                    <Button
                      variant="ghost"
                      size="lg"
                      className="text-primary"
                      onClick={() => void manageNative()}
                    >
                      {t("pages.contribute.manage")}
                    </Button>
                  </p>
                )}
                {hasStripeSubscription && (
                  <p>
                    <a
                      href={billingPortalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LINK_CLASSES}
                    >
                      {t("pages.contribute.manage")}
                    </a>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </PageContent>
    </>
  );
};
