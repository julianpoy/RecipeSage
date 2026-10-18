import { useId, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { UserPublic } from "@recipesage/prisma";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useActionQuery } from "../../hooks/useActionQuery";
import { usePropSyncedState } from "../../hooks/usePropSyncedState";
import { serverActions } from "../../services/serverActions";
import { resolveStorageLocation } from "../../utils/resolveStorageLocation";

export const SelectKnownUser = ({
  selectedUser: selectedUserInput,
  onSelectedUserChange,
}: {
  selectedUser?: UserPublic;
  onSelectedUserChange?: (user: UserPublic | undefined) => void;
}) => {
  const { t } = useTranslation();
  const idPrefix = useId();
  const [selectedUser, setSelectedUser] = usePropSyncedState(selectedUserInput);
  const [radioFriendshipId, setRadioFriendshipId] = useState<string>();
  const [radioThreadId, setRadioThreadId] = useState<string>();

  const friendsQuery = useActionQuery(["users.getMyFriends"], () =>
    serverActions.users.getMyFriends(),
  );
  const friendsLoaded = !!friendsQuery.data;
  const threadsQuery = useActionQuery(
    ["messages.getThreads"],
    () => serverActions.messages.getThreads(),
    { enabled: friendsLoaded },
  );

  const friendships = useMemo(
    () =>
      [...(friendsQuery.data?.friends || [])].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
    [friendsQuery.data],
  );

  const threads = useMemo(() => {
    if (!friendsLoaded) return [];
    const friendIds = new Set(friendships.map((friendship) => friendship.id));
    return (threadsQuery.data || [])
      .filter((thread) => !friendIds.has(thread.otherUser.id))
      .sort((a, b) => a.otherUser.name.localeCompare(b.otherUser.name));
  }, [friendsLoaded, friendships, threadsQuery.data]);

  const activeFriendshipId =
    radioFriendshipId && radioFriendshipId === selectedUser?.id
      ? radioFriendshipId
      : null;
  const activeThreadId =
    radioThreadId && radioThreadId === selectedUser?.id ? radioThreadId : null;

  const selectUser = (user: UserPublic) => {
    setSelectedUser(user);
    onSelectedUserChange?.(user);
  };

  const selectFriendship = (friendshipId: unknown) => {
    const friendship = friendships.find((el) => el.id === friendshipId);
    if (!friendship) return;
    setRadioFriendshipId(friendship.id);
    selectUser(friendship);
  };

  const selectThread = (otherUserId: unknown) => {
    const thread = threads.find((el) => el.otherUser.id === otherUserId);
    if (!thread) return;
    setRadioThreadId(thread.otherUser.id);
    selectUser(thread.otherUser);
  };

  return (
    <div className="flex flex-col gap-4">
      {friendships.length > 0 && (
        <RadioGroup
          value={activeFriendshipId}
          onValueChange={selectFriendship}
          aria-labelledby={`${idPrefix}-friends`}
          className="gap-0"
        >
          <h3
            id={`${idPrefix}-friends`}
            className="px-4 pt-2 pb-1 text-sm font-medium text-muted-foreground"
          >
            {t("components.selectKnownUser.friends")}
          </h3>
          {friendships.map((friendship) => {
            const itemId = `${idPrefix}-friend-${friendship.id}`;
            const imageLocation = friendship.profileImages?.[0]?.image.location;
            return (
              <label
                key={friendship.id}
                htmlFor={itemId}
                className="flex min-h-14 cursor-pointer items-center gap-4 border-b px-4 py-2 hover:bg-muted"
              >
                <img
                  src={
                    imageLocation
                      ? resolveStorageLocation(imageLocation)
                      : "assets/avatar.svg"
                  }
                  alt=""
                  className="size-10 shrink-0 rounded-full object-cover"
                />
                <RadioGroupItem id={itemId} value={friendship.id} />
                <div className="min-w-0 flex-1">
                  <div dir="auto" className="truncate text-base">
                    {friendship.name}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    @{friendship.handle}
                  </div>
                </div>
              </label>
            );
          })}
        </RadioGroup>
      )}

      {threads.length > 0 && (
        <RadioGroup
          value={activeThreadId}
          onValueChange={selectThread}
          aria-labelledby={`${idPrefix}-threads`}
          className="gap-0"
        >
          <h3
            id={`${idPrefix}-threads`}
            className="px-4 pt-2 pb-1 text-sm font-medium text-muted-foreground"
          >
            {t("components.selectKnownUser.conversations")}
          </h3>
          {threads.map((thread) => {
            const itemId = `${idPrefix}-thread-${thread.otherUser.id}`;
            return (
              <label
                key={thread.otherUser.id}
                htmlFor={itemId}
                className="flex min-h-14 cursor-pointer items-center gap-4 border-b px-4 py-2 hover:bg-muted"
              >
                <RadioGroupItem id={itemId} value={thread.otherUser.id} />
                <div className="min-w-0 flex-1">
                  <div dir="auto" className="truncate text-base">
                    {thread.otherUser.name}
                  </div>
                  {thread.otherUser.handle && (
                    <div className="truncate text-sm text-muted-foreground">
                      @{thread.otherUser.handle}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </RadioGroup>
      )}
    </div>
  );
};
