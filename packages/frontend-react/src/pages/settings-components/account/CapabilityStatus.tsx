import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export interface CapabilitySubscription {
  enabled: boolean;
  expires: string | null;
  expired: boolean | null;
}

export const CapabilityStatus = ({
  title,
  subscription,
  children,
}: {
  title: string;
  subscription?: CapabilitySubscription;
  children?: ReactNode;
}) => {
  const { t } = useTranslation();

  return (
    <div className="px-4 py-2">
      <h3 className="break-words">{title}</h3>
      <div className="text-sm text-muted-foreground">
        {subscription?.enabled ? (
          <p>{t("pages.account.bonus.enabled")}</p>
        ) : (
          <p>{t("pages.account.bonus.notEnabled")}</p>
        )}
        {children}
        {subscription && subscription.expired !== null && (
          <p>
            {subscription.expires && subscription.expired && (
              <span>
                {t("pages.account.bonus.subscriptionExpired", {
                  date: subscription.expires,
                })}
              </span>
            )}
            {subscription.expires && !subscription.expired && (
              <span>
                {t("pages.account.bonus.subscriptionExpires", {
                  date: subscription.expires,
                })}
              </span>
            )}
            {!subscription.expires && (
              <span>{t("pages.account.bonus.subscriptionNeverExpires")}</span>
            )}
            {subscription.expires && subscription.enabled && (
              <span> {t("pages.account.bonus.automaticRenewal")}</span>
            )}
          </p>
        )}
      </div>
    </div>
  );
};
