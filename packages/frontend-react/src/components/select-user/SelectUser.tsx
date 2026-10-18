import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderOpenIcon, SearchIcon } from "lucide-react";
import type { UserPublic } from "@recipesage/prisma";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useActionQuery } from "../../hooks/useActionQuery";
import { usePropSyncedState } from "../../hooks/usePropSyncedState";
import { loadingService } from "../../services/loadingService";
import { serverActions } from "../../services/serverActions";
import { resolveStorageLocation } from "../../utils/resolveStorageLocation";

const PAUSE_BEFORE_SEARCH = 500;

export const getUserAvatarSrc = (user: UserPublic) => {
  let firstImage: UserPublic["profileImages"][0] | undefined;

  for (const image of user.profileImages) {
    if (!firstImage) firstImage = image;
    else if (firstImage.order > image.order) firstImage = image;
  }

  const location = firstImage?.image?.location;
  return (location && resolveStorageLocation(location)) || "assets/avatar.svg";
};

export const SelectUser = ({
  selectedUser: selectedUserInput,
  enableSelectedMode = true,
  suggestKnownUsers = true,
  excludeUserIds = [],
  onSelectedUserChange,
  onSearchInputChange,
}: {
  selectedUser?: UserPublic;
  enableSelectedMode?: boolean;
  suggestKnownUsers?: boolean;
  excludeUserIds?: string[];
  onSelectedUserChange?: (user: UserPublic | undefined) => void;
  onSearchInputChange?: (searchText: string) => void;
}) => {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = usePropSyncedState(selectedUserInput);
  const [searchText, setSearchTextState] = useState("");
  const [results, setResults] = useState<UserPublic[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const knownUsersQuery = useActionQuery(
    ["users.getMyFriends"],
    () => serverActions.users.getMyFriends(),
    { enabled: suggestKnownUsers },
  );
  const knownUsers = knownUsersQuery.data?.friends || [];

  useEffect(() => () => clearTimeout(searchTimeoutRef.current), []);

  const setSearchText = (val: string) => {
    setSearchTextState(val);
    onSearchInputChange?.(val);
  };

  const search = async (rawInput: string) => {
    const input = (rawInput || "").trim();
    const handle = input.startsWith("@") ? input.substring(1) : input;
    if (!handle) return;

    const loading = loadingService.start();

    const found: UserPublic[] = [];

    const profileResponse = await serverActions.users.getUserProfileByHandle(
      {
        handle,
      },
      {
        404: () => {},
      },
    );
    if (profileResponse) {
      found.push(profileResponse);
    }

    const userResponse = await serverActions.users.getUserProfileByEmail(
      {
        email: input,
      },
      {
        404: () => {},
      },
    );

    if (userResponse) found.push(userResponse);

    let merged = found;
    if (suggestKnownUsers) {
      const query = handle.toLowerCase();
      const knownUserMatches = knownUsers.filter(
        (knownUser) =>
          knownUser.name.toLowerCase().includes(query) ||
          knownUser.handle?.toLowerCase().includes(query),
      );
      const knownUserIds = new Set(
        knownUserMatches.map((knownUser) => knownUser.id),
      );
      merged = [
        ...knownUserMatches,
        ...found.filter((result) => !knownUserIds.has(result.id)),
      ];
    }

    setResults(merged.filter((user) => !excludeUserIds.includes(user.id)));

    loading.dismiss();
  };

  const onSearchTextInput = (value: string) => {
    setSearchText(value);

    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = undefined;
    setSearching(false);

    if (!value) return;

    setResults([]);
    if (!value.trim() || value.trim() === "@") return;

    setSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      await search(value);
      setSearching(false);
    }, PAUSE_BEFORE_SEARCH);
  };

  const resetSearch = () => {
    clearTimeout(searchTimeoutRef.current);
    setResults([]);
    setSearchText("");
    setSearching(false);
  };

  const selectUser = (user: UserPublic) => {
    if (enableSelectedMode) {
      setSelectedUser(user);
    } else {
      resetSearch();
    }
    onSelectedUserChange?.(user);
  };

  const clearSelectedUser = () => {
    setSelectedUser(undefined);
    onSelectedUserChange?.(undefined);
    resetSearch();
  };

  if (selectedUser) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-4 rounded-xl px-4 py-2 text-start hover:bg-muted"
        onClick={clearSelectedUser}
      >
        <img
          src={getUserAvatarSrc(selectedUser)}
          alt=""
          className="size-10 shrink-0 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <div dir="auto" className="truncate text-base">
            {selectedUser.name}
          </div>
          <div className="text-sm text-muted-foreground">
            {t("components.selectUser.change")}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div>
      <div className="p-2">
        <InputGroup className="h-10">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            dir="auto"
            autoComplete="off"
            placeholder={t("components.selectUser.placeholder")}
            value={searchText}
            onChange={(event) => onSearchTextInput(event.target.value)}
          />
        </InputGroup>
      </div>
      {searchText.length > 0 && (
        <div className="px-4">
          <div className="relative">
            <div className="w-full overflow-y-auto rounded-xl bg-popover text-popover-foreground shadow-[1px_1px_7px_rgba(0,0,0,0.4)]">
              {results.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full items-center gap-4 border-b px-4 py-2 text-start last:border-b-0 hover:bg-muted"
                  onClick={() => selectUser(user)}
                >
                  <img
                    src={getUserAvatarSrc(user)}
                    alt=""
                    className="size-10 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div dir="auto" className="truncate text-base">
                      {user.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("components.selectUser.select")}
                    </div>
                  </div>
                </button>
              ))}
              {searching && (
                <div className="flex items-center gap-4 px-4 py-3">
                  <Spinner className="size-6" />
                  <span dir="auto">
                    {t("components.selectUser.searching", {
                      name: searchText,
                    })}
                  </span>
                </div>
              )}
              {results.length === 0 && searchText.length > 0 && !searching && (
                <div className="flex items-center gap-4 px-4 py-3">
                  <FolderOpenIcon
                    className="size-6 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <span dir="auto">
                    {t("components.selectUser.null", { name: searchText })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
