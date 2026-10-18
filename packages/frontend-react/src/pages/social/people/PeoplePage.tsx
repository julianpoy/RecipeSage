import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  BanIcon,
  CircleUserIcon,
  MailIcon,
  MessagesSquareIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { IS_SELFHOST } from "../../../environments/environment";
import { NullState } from "../../../components/NullState";
import { showAlert } from "../../../components/dialogs/showAlert";
import { Fab } from "../../../components/layout/Fab";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { SelfhostWarningItem } from "../../../components/selfhost-warning-item/SelfhostWarningItem";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { loadingService } from "../../../services/loadingService";
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { serverActions } from "../../../services/serverActions";
import { UserAvatar } from "../UserAvatar";
import { openAddFriendModal } from "../add-friend-modal/openAddFriendModal";

type Friend = RouterOutputs["users"]["getMyFriends"]["friends"][number];

const NAV_ROW_CLASSES =
  "flex min-h-14 items-center gap-4 px-4 py-2 hover:bg-muted";

const NavRowContent = ({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children?: ReactNode;
}) => (
  <>
    {icon}
    <span className="min-w-0 flex-1">{label}</span>
    {children}
  </>
);

const IconAvatar = ({ children }: { children: ReactNode }) => (
  <span
    aria-hidden="true"
    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6"
  >
    {children}
  </span>
);

const SectionHeading = ({ children }: { children: ReactNode }) => (
  <li className="bg-muted px-4 py-2 text-sm font-medium text-muted-foreground">
    {children}
  </li>
);

const FriendRow = ({
  friend,
  children,
}: {
  friend: Friend;
  children: ReactNode;
}) => {
  const content = (
    <>
      <UserAvatar profileImages={friend.profileImages} />
      <span className="min-w-0 flex-1 truncate">
        <span dir="auto">{friend.name}</span>
      </span>
    </>
  );

  return (
    <li className="flex min-h-14 flex-wrap items-center gap-2 border-b pe-4">
      {friend.handle ? (
        <Link
          to="/people/$handle"
          params={{ handle: `@${friend.handle}` }}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-4 ps-4 hover:bg-muted"
        >
          {content}
        </Link>
      ) : (
        <div className="flex min-h-14 min-w-0 flex-1 items-center gap-4 ps-4">
          {content}
        </div>
      )}
      <div className="flex shrink-0 gap-2">{children}</div>
    </li>
  );
};

export const PeoplePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const meQuery = useOfflineFirstQuery(serverActions.users.getMe());
  const me = meQuery.data;

  const friendshipsQuery = useActionQuery(["users.getMyFriends"], () =>
    serverActions.users.getMyFriends(),
  );
  const friendships = friendshipsQuery.data;

  const inboxCountQuery = useActionQuery(
    ["recipes.getRecipeCount", { folder: "inbox" }],
    () => serverActions.recipes.getRecipeCount({ folder: "inbox" }),
  );
  const inboxCount = inboxCountQuery.data?.count;

  const blockedUsersQuery = useActionQuery(
    ["users.getMyBlockedUsers", { silent: true }],
    () =>
      serverActions.users.getMyBlockedUsers({
        "*": () => {},
      }),
  );
  const showBlockedUsersItem =
    !blockedUsersQuery.isPending &&
    (!blockedUsersQuery.data || blockedUsersQuery.data.length > 0);

  const friendshipsPending = friendshipsQuery.isPending;
  useEffect(() => {
    if (!friendshipsPending) return;
    const loading = loadingService.start();
    return () => loading.dismiss();
  }, [friendshipsPending]);

  const load = () => {
    const loading = loadingService.start();

    void meQuery.refetch();
    void friendshipsQuery.refetch().finally(() => loading.dismiss());
    void inboxCountQuery.refetch();
    void blockedUsersQuery.refetch();
  };

  const editProfile = () => {
    void navigate({ to: "/people/my-profile" });
  };

  const findProfile = async () => {
    if (!me?.enableProfile) {
      await showAlert({
        header: t("pages.people.setup.header"),
        message: t("pages.people.setup.message"),
        buttons: [
          {
            text: t("generic.cancel"),
            role: "cancel",
          },
          {
            text: t("pages.people.setup.confirm"),
            handler: () => {
              editProfile();
            },
          },
        ],
      });
      return;
    }

    await openAddFriendModal();
    load();
  };

  const addFriend = async (friendId: string) => {
    await serverActions.users.createFriendship({ friendId });
    load();
  };

  const deleteFriend = async (friendId: string) => {
    await serverActions.users.deleteFriendship({ friendId });
    load();
  };

  const hasAnyFriendships =
    !!friendships?.incomingRequests?.length ||
    !!friendships?.outgoingRequests?.length ||
    !!friendships?.friends?.length;

  return (
    <>
      <PageHeader title={t("pages.people.title")} />
      <PageContent padded={false} className="pb-24">
        <div className="mx-auto max-w-page">
          {IS_SELFHOST && <SelfhostWarningItem />}

          <ul className="mt-4">
            <li className="border-b">
              <Link to="/messages" className={NAV_ROW_CLASSES}>
                <NavRowContent
                  icon={
                    <IconAvatar>
                      <MessagesSquareIcon />
                    </IconAvatar>
                  }
                  label={t("pages.app.nav.messages")}
                />
              </Link>
            </li>
            <li className="border-b">
              <Link
                to="/list/$folder"
                params={{ folder: "inbox" }}
                className={NAV_ROW_CLASSES}
              >
                <NavRowContent
                  icon={
                    <IconAvatar>
                      <MailIcon />
                    </IconAvatar>
                  }
                  label={t("pages.app.nav.inbox")}
                >
                  {!!inboxCount && <Badge>{inboxCount}</Badge>}
                </NavRowContent>
              </Link>
            </li>
            {showBlockedUsersItem && (
              <li className="border-b">
                <Link to="/people/blocked-users" className={NAV_ROW_CLASSES}>
                  <NavRowContent
                    icon={
                      <IconAvatar>
                        <BanIcon />
                      </IconAvatar>
                    }
                    label={t("pages.people.blockedUsers")}
                  />
                </Link>
              </li>
            )}
            {me?.enableProfile && (
              <li className="border-b">
                <Link to="/people/my-profile" className={NAV_ROW_CLASSES}>
                  <NavRowContent
                    icon={<UserAvatar profileImages={me.profileImages} />}
                    label={t("pages.people.edit")}
                  />
                </Link>
              </li>
            )}
          </ul>

          {me === undefined && (
            <NullState icon={<Spinner />}>
              <p className="text-sm text-muted-foreground">
                {t("pages.people.loading")}
              </p>
            </NullState>
          )}

          {me && !me.enableProfile && (
            <NullState
              icon={
                <CircleUserIcon
                  aria-hidden="true"
                  className="text-muted-foreground"
                />
              }
            >
              <p className="px-4 text-sm text-muted-foreground">
                {t("pages.people.nullState.1")}
                <br />
                {t("pages.people.nullState.2")}
              </p>
              <Button className="mt-6" onClick={editProfile}>
                <PlusIcon data-icon="inline-start" />
                {t("pages.people.create")}
              </Button>
            </NullState>
          )}

          {me?.enableProfile && (
            <ul className="mt-12">
              {!!friendships?.friends?.length && (
                <SectionHeading>{t("pages.people.friends")}</SectionHeading>
              )}
              {friendships?.friends?.map((friendship) => (
                <FriendRow key={friendship.id} friend={friendship}>
                  <Button
                    variant="destructive"
                    onClick={() => void deleteFriend(friendship.id)}
                  >
                    {t("pages.people.unfriend")}
                  </Button>
                </FriendRow>
              ))}
              {!!friendships?.incomingRequests?.length && (
                <SectionHeading>{t("pages.people.invites")}</SectionHeading>
              )}
              {friendships?.incomingRequests?.map((friendship) => (
                <FriendRow key={friendship.id} friend={friendship}>
                  <Button onClick={() => void addFriend(friendship.id)}>
                    {t("pages.people.accept")}
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => void deleteFriend(friendship.id)}
                  >
                    {t("pages.people.decline")}
                  </Button>
                </FriendRow>
              ))}
              {!!friendships?.outgoingRequests?.length && (
                <SectionHeading>{t("pages.people.sentInvites")}</SectionHeading>
              )}
              {friendships?.outgoingRequests?.map((friendship) => (
                <FriendRow key={friendship.id} friend={friendship}>
                  <Button
                    variant="destructive"
                    onClick={() => void deleteFriend(friendship.id)}
                  >
                    {t("pages.people.cancel")}
                  </Button>
                </FriendRow>
              ))}
              {!hasAnyFriendships && (
                <li>
                  <NullState
                    icon={
                      <UsersIcon
                        aria-hidden="true"
                        className="text-muted-foreground"
                      />
                    }
                  >
                    <p className="px-4 text-sm text-muted-foreground">
                      {t("pages.people.noFriends.1")}
                      <br />
                      {t("pages.people.noFriends.2")}
                      <br />
                      {t("pages.people.noFriends.3")}
                    </p>
                  </NullState>
                </li>
              )}
            </ul>
          )}
        </div>
      </PageContent>
      <Fab
        aria-label={t("pages.addFriendModal.title")}
        onClick={() => void findProfile()}
      >
        <SearchIcon />
      </Fab>
    </>
  );
};
