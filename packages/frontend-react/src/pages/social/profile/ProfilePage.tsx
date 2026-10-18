import { useEffect, type ReactNode } from "react";
import { Link, getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  BookmarkIcon,
  CompassIcon,
  FolderIcon,
  KeyIcon,
  MailIcon,
  Share2Icon,
  TagIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { IS_SELFHOST } from "../../../environments/environment";
import { CachedImage } from "../../../components/CachedImage";
import { NullState } from "../../../components/NullState";
import { showAlert } from "../../../components/dialogs/showAlert";
import { showToast } from "../../../components/dialogs/showToast";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SelfhostWarningItem } from "../../../components/selfhost-warning-item/SelfhostWarningItem";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { useIsLoggedIn } from "../../../hooks/useIsLoggedIn";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { openImageViewer } from "../../../modals/image-viewer/openImageViewer";
import { blockAndReportUserService } from "../../../services/blockAndReportUserService";
import { FeatureFlagKeys, featureFlags } from "../../../services/featureFlags";
import { loadingService } from "../../../services/loadingService";
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { serverActions } from "../../../services/serverActions";
import { session } from "../../../utils/session";
import { openAuthDialog } from "../../auth/openAuthDialog";
import { openNewMessageModal } from "../../messaging-components/new-message-modal/openNewMessageModal";
import { openShareProfileModal } from "../share-profile-modal/openShareProfileModal";
import { UserActionsMenu } from "../user-actions-popover/UserActionsMenu";
import type { UserActionsPopoverAction } from "../user-actions-popover/UserActionsMenuItems";

const routeApi = getRouteApi("/people/$handle");

type ProfileItem = RouterOutputs["users"]["getVisibleUserProfileItems"][number];

interface ProfilePageData {
  profile: RouterOutputs["users"]["getUserProfileByHandle"];
  profileItems: RouterOutputs["users"]["getVisibleUserProfileItems"];
  publishedRecipes: RouterOutputs["discover"]["getDiscoverRecipesByAuthor"]["recipes"];
  isBlockedByMe: boolean;
  incomingFriendship: boolean;
  outgoingFriendship: boolean;
}

const ITEM_ROW_CLASSES =
  "flex min-h-14 items-center gap-4 border-b px-4 py-2 hover:bg-muted";

const ItemIcon = ({ children }: { children: ReactNode }) => (
  <span
    aria-hidden="true"
    className="flex w-10 shrink-0 justify-center text-muted-foreground [&_svg]:size-6"
  >
    {children}
  </span>
);

const ProfileItemRow = ({ item }: { item: ProfileItem }) => {
  const title = (
    <span className="min-w-0 flex-1 break-words">
      <span dir="auto">{item.title}</span>
    </span>
  );

  if (item.type === "all-recipes") {
    return (
      <Link
        to="/list/$folder"
        params={{ folder: "main" }}
        search={{ userId: item.userId }}
        className={ITEM_ROW_CLASSES}
      >
        <ItemIcon>
          <FolderIcon />
        </ItemIcon>
        {title}
      </Link>
    );
  }

  if (item.type === "label") {
    const content = (
      <>
        <ItemIcon>
          <TagIcon />
        </ItemIcon>
        {title}
      </>
    );
    if (!item.label) {
      return <div className={ITEM_ROW_CLASSES}>{content}</div>;
    }
    return (
      <Link
        to="/list/$folder"
        params={{ folder: "main" }}
        search={{ userId: item.userId, labels: item.label.title }}
        className={ITEM_ROW_CLASSES}
      >
        {content}
      </Link>
    );
  }

  const imageLocation = item.recipe?.recipeImages.at(0)?.image.location;
  const content = (
    <>
      {imageLocation && (
        <CachedImage
          src={imageLocation}
          className="size-10 shrink-0 rounded-full object-cover"
        />
      )}
      {title}
    </>
  );

  if (!item.recipe) {
    return <div className={ITEM_ROW_CLASSES}>{content}</div>;
  }

  return (
    <Link
      to="/recipe/$recipeId"
      params={{ recipeId: item.recipe.id }}
      className={ITEM_ROW_CLASSES}
    >
      {content}
    </Link>
  );
};

const SectionTitle = ({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) => (
  <div className="flex min-h-12 items-center gap-4 px-4 [&_svg]:size-5 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
    {icon}
    <span className="min-w-0 flex-1">{children}</span>
  </div>
);

const Profile = ({ handle }: { handle: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isLoggedIn = useIsLoggedIn();
  const enableDiscover = featureFlags[FeatureFlagKeys.EnableDiscover];

  const meQuery = useOfflineFirstQuery(
    serverActions.users.getMe({ 401: () => {} }),
  );
  const me = meQuery.data;

  const profileDisabledError = () => {
    void showAlert({
      header: t("pages.profile.disabled.header"),
      message: t("pages.profile.disabled.message"),
      buttons: [
        {
          text: t("generic.okay"),
          handler: () => {
            void navigate({ to: "/people", replace: true });
          },
        },
      ],
    });
  };

  const loadProfile = async (): Promise<ProfilePageData | undefined> => {
    const loading = loadingService.start();

    const profileResponse = await serverActions.users.getUserProfileByHandle(
      { handle },
      {
        404: () => profileDisabledError(),
      },
    );

    if (!profileResponse) {
      loading.dismiss();
      return undefined;
    }

    const loggedIn = session.isLoggedIn();
    const [items, friends, blockedUsers, publishedRecipes] = await Promise.all([
      serverActions.users.getVisibleUserProfileItems({
        userId: profileResponse.id,
      }),
      loggedIn
        ? serverActions.users.getMyFriends()
        : Promise.resolve(undefined),
      loggedIn
        ? serverActions.users.getMyBlockedUsers()
        : Promise.resolve(undefined),
      enableDiscover
        ? serverActions.discover.getDiscoverRecipesByAuthor({
            authorId: profileResponse.id,
          })
        : Promise.resolve(undefined),
    ]);

    loading.dismiss();

    let incomingFriendship = false;
    let outgoingFriendship = false;
    if (friends) {
      const isFriend = friends.friends.some(
        (friend) => friend.id === profileResponse.id,
      );
      incomingFriendship =
        isFriend ||
        friends.incomingRequests.some(
          (friend) => friend.id === profileResponse.id,
        );
      outgoingFriendship =
        isFriend ||
        friends.outgoingRequests.some(
          (friend) => friend.id === profileResponse.id,
        );
    }

    return {
      profile: profileResponse,
      profileItems: items ?? [],
      publishedRecipes: publishedRecipes?.recipes ?? [],
      isBlockedByMe: !!blockedUsers?.some(
        (blockedUser) => blockedUser.id === profileResponse.id,
      ),
      incomingFriendship,
      outgoingFriendship,
    };
  };

  const pageQuery = useActionQuery(
    ["users.getUserProfileByHandle", { handle }, "profilePage"],
    loadProfile,
  );
  const pageData = pageQuery.data;
  const profile = pageData?.profile;
  const profileItems = pageData?.profileItems || [];
  const publishedRecipes = pageData?.publishedRecipes || [];
  const isBlockedByMe = !!pageData?.isBlockedByMe;
  const incomingFriendship = !!pageData?.incomingFriendship;
  const outgoingFriendship = !!pageData?.outgoingFriendship;

  const isMyProfile = !!profile && me?.id === profile.id;

  const load = () => pageQuery.refetch();

  const addFriend = async () => {
    if (!profile) return;

    const loading = loadingService.start();

    const response = await serverActions.users.createFriendship({
      friendId: profile.id,
    });
    loading.dismiss();

    if (!response) return;

    showToast({
      message: t("pages.profile.inviteSent"),
      duration: 5000,
    });

    void load();
  };

  const deleteFriend = async () => {
    if (!profile) return;

    const loading = loadingService.start();

    const response = await serverActions.users.deleteFriendship({
      friendId: profile.id,
    });
    loading.dismiss();

    if (!response) return;

    showToast({
      message: t("pages.profile.inviteRemoved"),
      duration: 5000,
    });

    void load();
  };

  const block = async () => {
    if (!profile) return;

    const blocked = await blockAndReportUserService.blockUser(profile);
    if (blocked) void load();
  };

  const unblock = async () => {
    if (!profile) return;

    const unblocked = await blockAndReportUserService.unblockUser(profile);
    if (unblocked) void load();
  };

  const onUserAction = (action: UserActionsPopoverAction) => {
    if (!profile) return;

    switch (action) {
      case "report":
        void blockAndReportUserService.reportUser(profile);
        return;
      case "block":
        void block();
        return;
      case "unblock":
        void unblock();
        return;
    }
  };

  const setupMyProfile = () => {
    void navigate({ to: "/people/my-profile" });
  };

  const setupMyProfileAlert = async () => {
    await showAlert({
      header: t("pages.profile.setup.header"),
      message: t("pages.profile.setup.message"),
      buttons: [
        {
          text: t("generic.cancel"),
        },
        {
          text: t("pages.profile.setup.confirm"),
          handler: () => {
            setupMyProfile();
          },
        },
      ],
    });
  };

  const authAndAddFriend = async () => {
    await openAuthDialog();
    const [meResult, pageResult] = await Promise.all([
      meQuery.refetch(),
      load(),
    ]);

    const refreshed = pageResult.data;
    if (refreshed?.incomingFriendship || refreshed?.outgoingFriendship) {
      showToast({
        message: t("pages.profile.alreadyRequested"),
        duration: 3000,
      });
      return;
    }

    if (!meResult.data?.enableProfile) {
      void setupMyProfileAlert();
      return;
    }

    if (!refreshed) return;

    const loading = loadingService.start();
    const response = await serverActions.users.createFriendship({
      friendId: refreshed.profile.id,
    });
    loading.dismiss();
    if (!response) return;

    showToast({
      message: t("pages.profile.inviteSent"),
      duration: 5000,
    });

    void load();
  };

  const profileImageLocation = profile?.profileImages.at(0)?.image.location;

  return (
    <>
      <PageHeader
        start={
          isLoggedIn ? <BackButton fallback={{ to: "/people" }} /> : undefined
        }
        title={t("pages.profile.title", { name: profile?.name })}
        end={
          isLoggedIn &&
          profile &&
          !isMyProfile && (
            <UserActionsMenu
              isBlockedByMe={isBlockedByMe}
              onAction={onUserAction}
            />
          )
        }
      />
      <PageContent padded={false}>
        {!profile && (
          <NullState icon={<Spinner />}>
            <p className="text-sm text-muted-foreground">
              {t("pages.profile.loading")}
            </p>
          </NullState>
        )}

        {profile && (
          <div className="mx-auto max-w-page pb-4">
            <br />
            {IS_SELFHOST && <SelfhostWarningItem />}
            <br />
            <div className="flex items-center">
              {profileImageLocation ? (
                <button
                  type="button"
                  className="m-2.5 mt-4 size-20 shrink-0 self-start overflow-hidden rounded-sm shadow-[1px_1px_7px_rgba(0,0,0,0.5)] min-[641px]:size-[200px]"
                  aria-label={profile.name}
                  onClick={() =>
                    void openImageViewer({
                      imageUrls: profile.profileImages.map(
                        (profileImage) => profileImage.image.location,
                      ),
                    })
                  }
                >
                  <CachedImage
                    src={profileImageLocation}
                    className="size-full rounded-sm object-cover"
                  />
                </button>
              ) : (
                <div className="m-2.5 flex w-[200px] shrink-0 shadow-[1px_1px_7px_rgba(0,0,0,0.5)]">
                  <img
                    src="assets/imgs/logo_green.png"
                    alt=""
                    className="mx-auto my-[50px] size-[100px] rounded-sm"
                  />
                </div>
              )}
              <div className="min-w-0 px-4">
                <h3 className="text-xl font-medium break-words">
                  <span dir="auto">{profile.name}</span>
                </h3>
                <h5 className="mt-2 mb-8 text-sm break-words">
                  <span dir="ltr">@{profile.handle}</span>
                </h5>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    aria-label={t("generic.share")}
                    onClick={() => void openShareProfileModal({ profile })}
                  >
                    <Share2Icon className="size-6" />
                  </Button>
                  {isLoggedIn && !isMyProfile && !isBlockedByMe && (
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      aria-label={t("pages.newMessageModal.title")}
                      onClick={() =>
                        void openNewMessageModal({
                          initialRecipientId: profile.id,
                        })
                      }
                    >
                      <MailIcon className="size-6" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <br />
            <SectionTitle icon={<KeyIcon aria-hidden="true" />}>
              {t("pages.profile.pinned")}
            </SectionTitle>
            {profileItems.length > 0 && (
              <div className="border-t">
                {profileItems.map((item) => (
                  <ProfileItemRow key={item.id} item={item} />
                ))}
              </div>
            )}
            {!profileItems.length && (
              <NullState
                icon={
                  <BookmarkIcon
                    aria-hidden="true"
                    className="text-muted-foreground"
                  />
                }
              >
                <p className="px-4 text-sm text-muted-foreground">
                  {t("pages.profile.nullState", { name: profile.name })}
                </p>
              </NullState>
            )}
            {enableDiscover && publishedRecipes.length > 0 && (
              <>
                <br />
                <SectionTitle icon={<CompassIcon aria-hidden="true" />}>
                  {t("pages.profile.publishedRecipes")}
                </SectionTitle>
                <div className="border-t">
                  {publishedRecipes.map((publishedRecipe) => {
                    const imageLocation =
                      publishedRecipe.discoverRecipeImages.at(0)?.image
                        .location;
                    return (
                      <Link
                        key={publishedRecipe.id}
                        to="/discover/$discoverRecipeId"
                        params={{ discoverRecipeId: publishedRecipe.id }}
                        className={ITEM_ROW_CLASSES}
                      >
                        {imageLocation && (
                          <CachedImage
                            src={imageLocation}
                            className="size-10 shrink-0 rounded-full object-cover"
                          />
                        )}
                        <span className="min-w-0 flex-1 break-words">
                          <span dir="auto">{publishedRecipe.title}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </PageContent>

      {profile && !isMyProfile && (
        <PageFooter className="px-4 py-2">
          <div className="mx-auto flex max-w-page gap-2">
            {isLoggedIn && isBlockedByMe && (
              <Button
                size="lg"
                className="flex-1"
                onClick={() => void unblock()}
              >
                {t("pages.profile.unblock")}
              </Button>
            )}
            {isLoggedIn && !isBlockedByMe && me?.enableProfile && (
              <>
                {!incomingFriendship && !outgoingFriendship && (
                  <Button
                    size="lg"
                    className="flex-1"
                    onClick={() => void addFriend()}
                  >
                    {t("pages.profile.send")}
                  </Button>
                )}
                {!incomingFriendship && outgoingFriendship && (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => void deleteFriend()}
                  >
                    {t("pages.profile.cancel")}
                  </Button>
                )}
                {incomingFriendship && !outgoingFriendship && (
                  <>
                    <Button
                      size="lg"
                      className="flex-1"
                      onClick={() => void addFriend()}
                    >
                      {t("pages.profile.accept")}
                    </Button>
                    <Button
                      size="lg"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => void deleteFriend()}
                    >
                      {t("pages.profile.decline")}
                    </Button>
                  </>
                )}
                {incomingFriendship && outgoingFriendship && (
                  <Button
                    size="lg"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => void deleteFriend()}
                  >
                    {t("pages.profile.unfriend")}
                  </Button>
                )}
              </>
            )}
            {isLoggedIn && !isBlockedByMe && !me?.enableProfile && (
              <Button size="lg" className="flex-1" onClick={setupMyProfile}>
                {t("pages.profile.setup")}
              </Button>
            )}
            {!isLoggedIn && (
              <Button
                size="lg"
                className="flex-1"
                onClick={() => void authAndAddFriend()}
              >
                {t("pages.profile.login")}
              </Button>
            )}
          </div>
        </PageFooter>
      )}
    </>
  );
};

export const ProfilePage = () => {
  const navigate = useNavigate();
  const { handle: handleParam } = routeApi.useParams();
  const handle = handleParam.substring(1);

  useEffect(() => {
    if (handle) return;
    void navigate({ to: "/people", replace: true });
  }, [handle, navigate]);

  if (!handle) return null;

  return <Profile key={handle} handle={handle} />;
};
