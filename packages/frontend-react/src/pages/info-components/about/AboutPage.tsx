import type { ReactNode } from "react";
import { Link, type LinkProps } from "@tanstack/react-router";
import {
  ArchiveIcon,
  CircleHelpIcon,
  HeartIcon,
  ListIcon,
  SendIcon,
  UserIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../../components/layout/PageHeader";
import { PageContent } from "../../../components/layout/PageContent";
import { SocialLinks } from "../../../components/social-links/SocialLinks";

const ITEM_CLASSES =
  "flex min-h-12 items-center gap-4 border-b px-4 py-2 text-base hover:bg-muted [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

const AboutLinkItem = ({
  icon,
  children,
  ...linkProps
}: LinkProps & { icon: ReactNode; children: ReactNode }) => (
  <Link {...linkProps} className={ITEM_CLASSES}>
    {icon}
    <span>{children}</span>
  </Link>
);

const AboutExternalItem = ({
  icon,
  href,
  children,
}: {
  icon: ReactNode;
  href: string;
  children: ReactNode;
}) => (
  <a href={href} target="_blank" rel="noopener" className={ITEM_CLASSES}>
    {icon}
    <span>{children}</span>
  </a>
);

export const AboutPage = () => {
  const { t } = useTranslation();

  return (
    <>
      <PageHeader title={t("pages.about.title")} />
      <PageContent>
        <div className="mx-auto max-w-page">
          <nav className="flex flex-col">
            <AboutExternalItem
              icon={<CircleHelpIcon aria-hidden="true" />}
              href="https://docs.recipesage.com"
            >
              {t("pages.about.links.userGuide")}
            </AboutExternalItem>
            <AboutLinkItem
              icon={<SendIcon aria-hidden="true" />}
              to="/about/contact"
            >
              {t("pages.about.links.contact")}
            </AboutLinkItem>
            <AboutLinkItem
              icon={<HeartIcon aria-hidden="true" />}
              to="/contribute"
              state={{ showBack: true }}
            >
              {t("pages.about.links.contribute")}
            </AboutLinkItem>
            <AboutExternalItem
              icon={<ArchiveIcon aria-hidden="true" />}
              href="https://docs.recipesage.com/docs/release-notes"
            >
              {t("pages.about.links.releaseNotes")}
            </AboutExternalItem>
            <AboutLinkItem
              icon={<UserIcon aria-hidden="true" />}
              to="/about/details"
            >
              {t("pages.about.links.details")}
            </AboutLinkItem>
            <AboutLinkItem icon={<ListIcon aria-hidden="true" />} to="/legal">
              {t("pages.about.links.legal")}
            </AboutLinkItem>
          </nav>

          <p className="mt-8 mb-2 font-bold">{t("pages.about.socialTitle")}</p>
          <SocialLinks />
        </div>
      </PageContent>
    </>
  );
};
