import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { MailIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyWithWebshare } from "../../../components/copy-with-webshare/CopyWithWebshare";
import { ModalDialog } from "../../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../../components/dialogs/openDialog";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { resolveStorageLocation } from "../../../utils/resolveStorageLocation";
import { getShareLinkOrigin } from "../../../utils/serverConfig";

const FACEBOOK_PATH =
  "M480 257.35c0-123.7-100.3-224-224-224s-224 100.3-224 224c0 111.8 81.9 204.47 189 221.29V322.12h-56.89v-64.77H221V208c0-56.13 33.45-87.16 84.61-87.16 24.51 0 50.15 4.38 50.15 4.38v55.13H327.5c-27.81 0-36.51 17.26-36.51 35v42h62.12l-9.92 64.77H291v156.54c107.1-16.81 189-109.48 189-221.31";

const TWITTER_PATH =
  "M496 109.5a201.8 201.8 0 0 1-56.55 15.3 97.5 97.5 0 0 0 43.33-53.6 197.7 197.7 0 0 1-62.56 23.5A99.14 99.14 0 0 0 348.31 64c-54.42 0-98.46 43.4-98.46 96.9a93.2 93.2 0 0 0 2.54 22.1 280.7 280.7 0 0 1-203-101.3A95.7 95.7 0 0 0 36 130.4c0 33.6 17.53 63.3 44 80.7A97.5 97.5 0 0 1 35.22 199v1.2c0 47 34 86.1 79 95a100.8 100.8 0 0 1-25.94 3.4 94.4 94.4 0 0 1-18.51-1.8c12.51 38.5 48.92 66.5 92.05 67.3A199.6 199.6 0 0 1 39.5 405.6a203 203 0 0 1-23.5-1.4A278.7 278.7 0 0 0 166.74 448c181.36 0 280.44-147.7 280.44-275.8 0-4.2-.11-8.4-.31-12.5A198.5 198.5 0 0 0 496 109.5";

const PINTEREST_PATH =
  "M256.05 32c-123.7 0-224 100.3-224 224 0 91.7 55.2 170.5 134.1 205.2-.6-15.6-.1-34.4 3.9-51.4 4.3-18.2 28.8-122.1 28.8-122.1s-7.2-14.3-7.2-35.4c0-33.2 19.2-58 43.2-58 20.4 0 30.2 15.3 30.2 33.6 0 20.5-13.1 51.1-19.8 79.5-5.6 23.8 11.9 43.1 35.4 43.1 42.4 0 71-54.5 71-119.1 0-49.1-33.1-85.8-93.2-85.8-67.9 0-110.3 50.7-110.3 107.3 0 19.5 5.8 33.3 14.8 43.9 4.1 4.9 4.7 6.9 3.2 12.5-1.1 4.1-3.5 14-4.6 18-1.5 5.7-6.1 7.7-11.2 5.6-31.3-12.8-45.9-47-45.9-85.6 0-63.6 53.7-139.9 160.1-139.9 85.5 0 141.8 61.9 141.8 128.3 0 87.9-48.9 153.5-120.9 153.5-24.2 0-46.9-13.1-54.7-27.9 0 0-13 51.6-15.8 61.6-4.7 17.3-14 34.5-22.5 48a225.1 225.1 0 0 0 63.5 9.2c123.7 0 224-100.3 224-224S379.75 32 256.05 32";

export interface ShareProfileModalProfile {
  name: string;
  handle: string | null;
  profileImages: { image: { location: string } }[];
}

const BrandIcon = ({ path }: { path: string }) => (
  <svg viewBox="0 0 512 512" className="size-6 fill-current" aria-hidden="true">
    <path fillRule="evenodd" d={path} />
  </svg>
);

const ShareIconButton = ({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Button
    variant="ghost"
    size="icon-lg"
    className="size-12 text-foreground"
    aria-label={label}
    onClick={onClick}
  >
    {children}
  </Button>
);

const openShareUrl = (url: string) => {
  window.open(url, "_blank", "noopener");
};

export const ShareProfileModal = ({
  controls,
  profile,
}: {
  controls: DialogControls<void>;
  profile: ShareProfileModalProfile;
}) => {
  const { t } = useTranslation();

  const profileUrl = `${getShareLinkOrigin()}/app/people/@${profile.handle}`;
  const shareTitle = t("pages.shareProfileModal.shareTitle", {
    name: profile.name,
  });

  const openFacebook = () => {
    openShareUrl(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        profileUrl,
      )}`,
    );
  };

  const openTwitter = () => {
    openShareUrl(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        profileUrl,
      )}&text=${encodeURIComponent(shareTitle)}`,
    );
  };

  const openPinterest = () => {
    const imageUrl = encodeURIComponent(
      resolveStorageLocation(profile.profileImages.at(0)?.image.location || ""),
    );
    const url = encodeURIComponent(profileUrl);

    openShareUrl(
      `https://pinterest.com/pin/create/button/?url=${url}&media=${imageUrl}&description=${encodeURIComponent(
        shareTitle,
      )}`,
    );
  };

  const openEmail = () => {
    const message = t("pages.shareProfileModal.shareBody", {
      name: profile.name,
    });
    const url = encodeURIComponent(` ${profileUrl}`);

    openShareUrl(
      `mailto:info@example.com?&subject=${encodeURIComponent(
        shareTitle,
      )}&body=${encodeURIComponent(message)}${url}`,
    );
  };

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={t("pages.shareProfileModal.title", { name: profile.name })}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={() => controls.close()}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <PageContent padded={false}>
        <CopyWithWebshare
          webshareTitle={shareTitle}
          webshareText={t("pages.shareProfileModal.shareBody", {
            name: profile.name,
          })}
          webshareURL={profileUrl}
          copyText={profileUrl}
        />

        <div className="flex justify-center gap-2 py-2">
          <ShareIconButton label="Facebook" onClick={openFacebook}>
            <BrandIcon path={FACEBOOK_PATH} />
          </ShareIconButton>
          <ShareIconButton label="Twitter" onClick={openTwitter}>
            <BrandIcon path={TWITTER_PATH} />
          </ShareIconButton>
          <ShareIconButton label="Pinterest" onClick={openPinterest}>
            <BrandIcon path={PINTEREST_PATH} />
          </ShareIconButton>
          <ShareIconButton
            label={t("pages.auth.input.email")}
            onClick={openEmail}
          >
            <MailIcon className="size-6" />
          </ShareIconButton>
        </div>
      </PageContent>
      <PageFooter className="p-4">
        <Button size="lg" className="w-full" onClick={() => controls.close()}>
          <XIcon data-icon="inline-start" />
          {t("pages.shareProfileModal.close")}
        </Button>
      </PageFooter>
    </ModalDialog>
  );
};
