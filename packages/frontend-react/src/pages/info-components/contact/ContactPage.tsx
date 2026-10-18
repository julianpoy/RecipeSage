import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { BackButton } from "../../../components/layout/BackButton";
import { SocialLinks } from "../../../components/social-links/SocialLinks";

const LINK_CLASSES = "text-primary underline-offset-4 hover:underline";

export const ContactPage = () => {
  const { t } = useTranslation();
  const [showEmail, setShowEmail] = useState(false);

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/about" }} />}
        title={t("pages.contact.title")}
      />
      <PageContent>
        <div className="mx-auto flex max-w-page flex-col gap-4">
          <p>
            <b>{t("pages.contact.subtitle")}</b>
          </p>

          <p>
            {t("pages.contact.pleaseUserGuide")}{" "}
            <a href="https://docs.recipesage.com" className={LINK_CLASSES}>
              https://docs.recipesage.com
            </a>
          </p>

          <p>
            {t("pages.contact.discord")}{" "}
            <a
              href="https://discord.gg/yCfzBft"
              target="_blank"
              className={LINK_CLASSES}
            >
              {t("pages.contact.discord.link")}
            </a>
          </p>

          <p>
            {t("pages.contact.github")}{" "}
            <a
              href="https://github.com/julianpoy/recipesage/issues"
              target="_blank"
              className={LINK_CLASSES}
            >
              {t("pages.contact.github.link")}
            </a>
          </p>

          {showEmail ? (
            <p>
              {t("pages.contact.emailMe")}{" "}
              <a
                href="mailto:julian@recipesage.com?subject=RecipeSage Support"
                className={LINK_CLASSES}
              >
                julian@recipesage.com
              </a>
            </p>
          ) : (
            <p>
              <button
                type="button"
                className={LINK_CLASSES}
                onClick={() => setShowEmail(true)}
              >
                {t("pages.contact.cantUseDiscord")}
              </button>
            </p>
          )}

          <p className="mt-4">
            <b>{t("pages.contact.socialTitle")}</b>
          </p>
          <SocialLinks />
        </div>
      </PageContent>
    </>
  );
};
