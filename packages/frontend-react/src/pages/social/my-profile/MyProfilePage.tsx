import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import {
  ArrowRightIcon,
  BookmarkIcon,
  FolderIcon,
  GripVerticalIcon,
  KeyIcon,
  PencilIcon,
  PlusIcon,
  Share2Icon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";
import type { ImageSummary } from "@recipesage/prisma";
import { isHandleValid } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CachedImage } from "../../../components/CachedImage";
import { NullState } from "../../../components/NullState";
import { showAlert } from "../../../components/dialogs/showAlert";
import { TextField } from "../../../components/forms/TextField";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageFooter } from "../../../components/layout/PageFooter";
import { PageHeader } from "../../../components/layout/PageHeader";
import { MultiImageUpload } from "../../../components/multi-image-upload/MultiImageUpload";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { loadingService } from "../../../services/loadingService";
import type {
  RouterInputs,
  RouterOutputs,
} from "../../../services/server-actions/ActionsBase";
import { serverActions } from "../../../services/serverActions";
import { unsavedChanges } from "../../../services/unsavedChanges";
import type { ProfileFormItem } from "../add-profile-item-modal/AddProfileItemModal";
import { openAddProfileItemModal } from "../add-profile-item-modal/openAddProfileItemModal";
import { openShareProfileModal } from "../share-profile-modal/openShareProfileModal";

interface KeyedProfileFormItem {
  key: string;
  item: ProfileFormItem;
}

interface ProfileForm {
  id: string;
  name: string;
  handle: string | null;
  enableProfile: boolean;
  profileImages: ImageSummary[];
  profileItems: KeyedProfileFormItem[];
}

interface UpdatedProfileFields {
  name?: string;
  handle?: string | null;
  enableProfile?: boolean;
  profileImages?: ImageSummary[];
  profileItems?: KeyedProfileFormItem[];
}

let nextProfileItemKey = 0;

const keyProfileItem = (item: ProfileFormItem): KeyedProfileFormItem => ({
  key: `profile-item-${nextProfileItemKey++}`,
  item,
});

const markAsDirty = () => {
  unsavedChanges.setPendingChanges();
};

const markAsClean = () => {
  unsavedChanges.clearPendingChanges();
};

const ITEM_ICON_CLASSES =
  "flex w-10 shrink-0 justify-center text-muted-foreground [&_svg]:size-6";

const ProfileItemRow = ({
  entry,
  index,
  userId,
  onRemove,
}: {
  entry: KeyedProfileFormItem;
  index: number;
  userId: string;
  onRemove: () => void;
}) => {
  const { t } = useTranslation();
  const { ref, handleRef, isDragging } = useSortable({
    id: entry.key,
    index,
  });
  const { item } = entry;

  const imageLocation = item.recipe?.recipeImages.at(0)?.image.location;

  const content: ReactNode = (
    <>
      {item.type === "all-recipes" && (
        <span aria-hidden="true" className={ITEM_ICON_CLASSES}>
          <FolderIcon />
        </span>
      )}
      {item.type === "label" && (
        <span aria-hidden="true" className={ITEM_ICON_CLASSES}>
          <TagIcon />
        </span>
      )}
      {item.type === "recipe" && imageLocation && (
        <CachedImage
          src={imageLocation}
          className="size-10 shrink-0 rounded-full object-cover"
        />
      )}
      <span className="min-w-0 flex-1 break-words">
        <span dir="auto">{item.title}</span>
      </span>
    </>
  );

  const linkClasses =
    "flex min-h-14 min-w-0 flex-1 items-center gap-4 py-2 ps-4 hover:bg-muted";

  let mainContent: ReactNode = <div className={linkClasses}>{content}</div>;
  if (item.type === "all-recipes") {
    mainContent = (
      <Link
        to="/list/$folder"
        params={{ folder: "main" }}
        search={{ userId }}
        className={linkClasses}
      >
        {content}
      </Link>
    );
  } else if (item.type === "label" && item.label) {
    mainContent = (
      <Link
        to="/list/$folder"
        params={{ folder: "main" }}
        search={{ userId, labels: item.label.title }}
        className={linkClasses}
      >
        {content}
      </Link>
    );
  } else if (item.type === "recipe" && item.recipe) {
    mainContent = (
      <Link
        to="/recipe/$recipeId"
        params={{ recipeId: item.recipe.id }}
        className={linkClasses}
      >
        {content}
      </Link>
    );
  }

  return (
    <li
      ref={ref}
      className={cn(
        "flex items-center gap-2 border-b bg-background pe-2",
        isDragging && "relative z-10 shadow-lg",
      )}
    >
      {mainContent}
      <Button
        variant="ghost"
        size="icon-lg"
        className="ms-2 shrink-0 text-destructive hover:text-destructive"
        aria-label={t("generic.delete")}
        onClick={onRemove}
      >
        <Trash2Icon className="size-5" />
      </Button>
      <button
        type="button"
        ref={handleRef}
        aria-label={t("generic.reorder")}
        className="flex size-10 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVerticalIcon className="size-5" />
      </button>
    </li>
  );
};

const HandleHints = ({
  updatedHandle,
  isHandleAvailable,
}: {
  updatedHandle: string | null | undefined;
  isHandleAvailable: boolean;
}) => {
  const { t } = useTranslation();

  return (
    <div className="py-2 text-sm">
      {updatedHandle && !isHandleAvailable && (
        <p className="text-destructive">{t("pages.myProfile.handle.taken")}</p>
      )}
      {updatedHandle && !isHandleValid(updatedHandle) && (
        <p className="text-destructive">
          {t("pages.myProfile.handle.invalid")}
        </p>
      )}
      <p className="text-muted-foreground">
        {t("pages.myProfile.handle.unique")}
      </p>
    </div>
  );
};

export const MyProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [revealNameInput, setRevealNameInput] = useState(false);
  const [revealHandleInput, setRevealHandleInput] = useState(false);
  const [myProfile, setMyProfile] = useState<ProfileForm>();
  const [requiresSetup, setRequiresSetup] = useState(false);
  const [checkingHandleAvailable, setCheckingHandleAvailable] = useState(false);
  const [isHandleAvailable, setIsHandleAvailable] = useState(true);
  const [updatedProfileFields, setUpdatedProfileFields] =
    useState<UpdatedProfileFields>({});
  const hasCheckedProfileEnabledRef = useRef(false);
  const handleInputTimeoutRef =
    useRef<ReturnType<typeof setTimeout>>(undefined);

  const meQuery = useOfflineFirstQuery(
    serverActions.users.getMe({
      401: () => {
        void navigate({
          to: "/auth/$authType",
          params: { authType: "login" },
          replace: true,
        });
      },
    }),
  );
  const me = meQuery.data;

  useEffect(() => () => clearTimeout(handleInputTimeoutRef.current), []);

  const isUpdatePending = Object.keys(updatedProfileFields).length > 0;

  const checkProfileEnabled = async (profile: ProfileForm | undefined) => {
    if (!profile || !profile.handle || !profile.name || profile.enableProfile) {
      return;
    }

    await showAlert({
      header: t("pages.myProfile.notEnabled.header"),
      message: t("pages.myProfile.notEnabled.message"),
      buttons: [
        {
          text: t("pages.myProfile.ignore"),
          role: "cancel",
        },
        {
          text: t("pages.myProfile.enable"),
          handler: () => {
            setUpdatedProfileFields((prev) => ({
              ...prev,
              enableProfile: true,
            }));
            setMyProfile((prev) => prev && { ...prev, enableProfile: true });

            markAsDirty();
          },
        },
      ],
    });
  };

  const meId = me?.id;
  const profileItemsQuery = useActionQuery(
    ["users.getVisibleUserProfileItems", { userId: meId }],
    () =>
      serverActions.users.getVisibleUserProfileItems({
        userId: meId || "",
      }),
    { enabled: !!meId },
  );
  const profileItemsData = profileItemsQuery.data;

  const [seededMe, setSeededMe] = useState<RouterOutputs["users"]["getMe"]>();
  if (me && me !== seededMe && !isUpdatePending) {
    setSeededMe(me);
    setMyProfile((prev) => ({
      id: me.id,
      name: me.name,
      handle: me.handle,
      enableProfile: me.enableProfile,
      profileImages: me.profileImages.map((profileImage) => profileImage.image),
      profileItems: prev?.profileItems ?? [],
    }));

    const nextRequiresSetup = !me.name || !me.handle;
    setRequiresSetup(nextRequiresSetup);

    if (nextRequiresSetup) {
      setUpdatedProfileFields((prev) => ({ ...prev, enableProfile: true }));
    }
  }

  const [seededProfileItems, setSeededProfileItems] =
    useState<typeof profileItemsData>();
  if (
    myProfile &&
    profileItemsData &&
    profileItemsData !== seededProfileItems &&
    !updatedProfileFields.profileItems
  ) {
    setSeededProfileItems(profileItemsData);
    const keyedItems = profileItemsData.map((profileItem) =>
      keyProfileItem({
        title: profileItem.title,
        type: profileItem.type,
        visibility: profileItem.visibility,
        label: profileItem.label,
        recipe: profileItem.recipe,
      }),
    );
    setMyProfile((prev) => prev && { ...prev, profileItems: keyedItems });
  }

  const profileItemsLoaded = !!seededProfileItems;
  const onProfileItemsLoaded = useEffectEvent(() => {
    if (hasCheckedProfileEnabledRef.current) return;
    hasCheckedProfileEnabledRef.current = true;
    void checkProfileEnabled(myProfile);
  });

  useEffect(() => {
    if (!profileItemsLoaded) return;
    onProfileItemsLoaded();
  }, [profileItemsLoaded]);

  const checkHandleAvailable = async (handle: string) => {
    if (!handle) {
      setIsHandleAvailable(false);
      return;
    }
    const response = await serverActions.users.getIsHandleAvailable({
      handle,
    });
    if (!response) return;
    setIsHandleAvailable(response.available);
  };

  const onNameChange = (name: string) => {
    setMyProfile((prev) => prev && { ...prev, name });
    setUpdatedProfileFields((prev) => ({ ...prev, name }));
    markAsDirty();
  };

  const onHandleChange = (rawHandle: string) => {
    setMyProfile((prev) => prev && { ...prev, handle: rawHandle });

    clearTimeout(handleInputTimeoutRef.current);
    const handle = rawHandle.startsWith("@")
      ? rawHandle.substring(1)
      : rawHandle;
    setUpdatedProfileFields((prev) => ({ ...prev, handle }));
    markAsDirty();

    if (!isHandleValid(handle)) return;

    setCheckingHandleAvailable(true);
    handleInputTimeoutRef.current = setTimeout(() => {
      void checkHandleAvailable(handle).finally(() => {
        setCheckingHandleAvailable(false);
      });
    }, 250);
  };

  const updateProfileImages = (profileImages: ImageSummary[]) => {
    setMyProfile((prev) => prev && { ...prev, profileImages });
    setUpdatedProfileFields((prev) => ({ ...prev, profileImages }));
    markAsDirty();
  };

  const onEnableProfileChange = (enableProfile: boolean) => {
    setMyProfile((prev) => prev && { ...prev, enableProfile });
    setUpdatedProfileFields((prev) => ({ ...prev, enableProfile }));
    markAsDirty();
  };

  const updateProfileItems = (profileItems: KeyedProfileFormItem[]) => {
    setMyProfile((prev) => prev && { ...prev, profileItems });
    setUpdatedProfileFields((prev) => ({ ...prev, profileItems }));
    markAsDirty();
  };

  const updatedHandle = updatedProfileFields.handle;

  const inputIsValid = (() => {
    if (requiresSetup && !myProfile?.handle) return false;
    if (checkingHandleAvailable) return false;

    if (updatedHandle && !isHandleAvailable) return false;
    if (updatedHandle && !isHandleValid(updatedHandle)) return false;

    return true;
  })();

  const save = async () => {
    const loading = loadingService.start();
    const update: RouterInputs["users"]["updateMyProfile"] = {
      name: updatedProfileFields.name,
      handle: updatedProfileFields.handle ?? undefined,
      enableProfile: updatedProfileFields.enableProfile,
    };

    if (updatedProfileFields.profileImages) {
      update.profileImageIds = updatedProfileFields.profileImages.map(
        (image) => image.id,
      );
    }

    if (updatedProfileFields.profileItems) {
      update.profileItems = updatedProfileFields.profileItems.map(
        ({ item }) => ({
          title: item.title,
          visibility: item.visibility,
          type: item.type,
          labelId: item.label?.id || null,
          recipeId: item.recipe?.id || null,
        }),
      );
    }

    const updated = await serverActions.users.updateMyProfile(update);
    loading.dismiss();
    if (!updated) return false;

    setUpdatedProfileFields({});
    markAsClean();
    void meQuery.refetch();
    void profileItemsQuery.refetch();
    return true;
  };

  const confirmSaveBeforeContinuing = async (
    headerKey:
      | "pages.myProfile.share.unsaved.header"
      | "pages.myProfile.view.unsaved.header",
    messageKey:
      | "pages.myProfile.share.unsaved.message"
      | "pages.myProfile.view.unsaved.message",
    onSaved: () => void,
  ) => {
    await showAlert({
      header: t(headerKey),
      message: t(messageKey),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
        },
        {
          text: t("generic.save"),
          handler: async () => {
            const saved = await save();
            if (saved) onSaved();
          },
        },
      ],
    });
  };

  const openShare = () => {
    if (!myProfile?.enableProfile) {
      void checkProfileEnabled(myProfile);
      return;
    }
    void openShareProfileModal({
      profile: {
        name: myProfile.name,
        handle: updatedHandle ?? myProfile.handle,
        profileImages: myProfile.profileImages.map((image) => ({ image })),
      },
    });
  };

  const shareProfile = () => {
    if (isUpdatePending) {
      void confirmSaveBeforeContinuing(
        "pages.myProfile.share.unsaved.header",
        "pages.myProfile.share.unsaved.message",
        openShare,
      );
      return;
    }
    openShare();
  };

  const openView = () => {
    if (!myProfile?.enableProfile) {
      void checkProfileEnabled(myProfile);
      return;
    }
    void navigate({
      to: "/people/$handle",
      params: { handle: `@${updatedHandle ?? myProfile.handle}` },
    });
  };

  const viewProfile = () => {
    if (isUpdatePending) {
      void confirmSaveBeforeContinuing(
        "pages.myProfile.view.unsaved.header",
        "pages.myProfile.view.unsaved.message",
        openView,
      );
      return;
    }
    openView();
  };

  const startNewProfileItem = async () => {
    if (!myProfile) return;

    const result = await openAddProfileItemModal();
    if (!result?.item) return;

    updateProfileItems([
      ...myProfile.profileItems,
      keyProfileItem(result.item),
    ]);
  };

  const removeProfileItem = (idx: number) => {
    if (!myProfile) return;

    updateProfileItems(
      myProfile.profileItems.filter((_, itemIdx) => itemIdx !== idx),
    );
  };

  const reorderProfileItem = (from: number, to: number) => {
    if (!myProfile || from === to) return;

    const profileItems = [...myProfile.profileItems];
    const [item] = profileItems.splice(from, 1);
    if (!item) return;
    profileItems.splice(to, 0, item);
    updateProfileItems(profileItems);
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/people" }} />}
        title={t("pages.myProfile.title")}
      />
      <PageContent padded={false} className="pb-12">
        <div className="mx-auto max-w-page">
          {!myProfile && (
            <NullState icon={<Spinner />}>
              <p className="text-sm text-muted-foreground">
                {t("pages.myProfile.loading")}
              </p>
            </NullState>
          )}

          {myProfile && requiresSetup && (
            <div className="mx-auto mt-[60px] flex max-w-[600px] flex-col p-4">
              <div className="mb-10 text-center">
                <h3 className="mb-2 text-xl font-medium">
                  {t("pages.myProfile.welcome")}
                </h3>
                {t("pages.myProfile.setup1")}
              </div>
              <p className="mb-2">{t("pages.myProfile.setup.name")}</p>
              <TextField
                label={t("pages.myProfile.name")}
                value={myProfile.name}
                onValueChange={onNameChange}
              />
              <p className="mt-12 mb-2">{t("pages.myProfile.setup2")}</p>
              <TextField
                label={t("pages.myProfile.handle")}
                value={myProfile.handle || ""}
                onValueChange={onHandleChange}
              />
              <HandleHints
                updatedHandle={updatedHandle}
                isHandleAvailable={isHandleAvailable}
              />
            </div>
          )}

          {myProfile && !requiresSetup && (
            <div>
              <br />
              <div className="flex flex-wrap">
                <div className="max-w-full">
                  <MultiImageUpload
                    images={myProfile.profileImages}
                    onImageUpdate={updateProfileImages}
                  />
                </div>
                <div
                  className={cn(
                    "min-w-0 px-4 pt-5 sm:min-w-[400px]",
                    myProfile.profileImages.length > 1 && "basis-full",
                  )}
                >
                  {revealNameInput ? (
                    <div className="py-2">
                      <TextField
                        label={t("pages.myProfile.name")}
                        value={myProfile.name}
                        onValueChange={onNameChange}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="flex max-w-full items-center gap-2 py-2 text-start text-xl font-medium"
                      onClick={() => setRevealNameInput(true)}
                    >
                      <span dir="auto" className="min-w-0 break-words">
                        {myProfile.name}
                      </span>
                      <PencilIcon
                        aria-hidden="true"
                        className="size-5 shrink-0 text-primary"
                      />
                    </button>
                  )}
                  {revealHandleInput ? (
                    <div className="py-2">
                      <TextField
                        label={t("pages.myProfile.handle")}
                        value={myProfile.handle || ""}
                        onValueChange={onHandleChange}
                        autoFocus
                      />
                      <HandleHints
                        updatedHandle={updatedHandle}
                        isHandleAvailable={isHandleAvailable}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-2 mb-8 flex max-w-full items-center gap-2 text-start text-sm"
                      onClick={() => setRevealHandleInput(true)}
                    >
                      <span dir="ltr" className="min-w-0 break-words">
                        @{myProfile.handle}
                      </span>
                      <PencilIcon
                        aria-hidden="true"
                        className="size-4 shrink-0 text-primary"
                      />
                    </button>
                  )}
                  <Label className="flex min-h-12 cursor-pointer items-center gap-4 py-2 text-base font-normal">
                    <span className="min-w-0 flex-1">
                      {t("pages.myProfile.enable")}
                    </span>
                    <Switch
                      checked={myProfile.enableProfile}
                      onCheckedChange={onEnableProfileChange}
                    />
                  </Label>
                  <div className="flex flex-wrap gap-4 py-2">
                    <Button onClick={shareProfile}>
                      {t("pages.myProfile.share")}
                      <Share2Icon data-icon="inline-end" />
                    </Button>
                    <Button onClick={viewProfile}>
                      {t("pages.myProfile.view")}
                      <ArrowRightIcon
                        data-icon="inline-end"
                        className="rtl:rotate-180"
                      />
                    </Button>
                  </div>
                </div>
              </div>
              <br />
              <div className="flex min-h-14 items-center gap-4 border-b px-4 py-2">
                <KeyIcon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1">
                  {t("pages.myProfile.pinned")}
                </span>
                <Button
                  className="shrink-0"
                  onClick={() => void startNewProfileItem()}
                >
                  <PlusIcon data-icon="inline-start" />
                  {t("pages.myProfile.add")}
                </Button>
              </div>
              {myProfile.profileItems.length > 0 && (
                <DragDropProvider
                  onDragEnd={(event) => {
                    if (event.canceled) return;
                    const { source } = event.operation;
                    if (!isSortable(source)) return;
                    reorderProfileItem(source.initialIndex, source.index);
                  }}
                >
                  <ul>
                    {myProfile.profileItems.map((entry, idx) => (
                      <ProfileItemRow
                        key={entry.key}
                        entry={entry}
                        index={idx}
                        userId={myProfile.id}
                        onRemove={() => removeProfileItem(idx)}
                      />
                    ))}
                  </ul>
                </DragDropProvider>
              )}
              {!myProfile.profileItems.length && (
                <NullState
                  icon={
                    <BookmarkIcon
                      aria-hidden="true"
                      className="text-muted-foreground"
                    />
                  }
                >
                  <p className="px-4 text-sm text-muted-foreground">
                    {t("pages.myProfile.nullState.1")}
                    <br />
                    {t("pages.myProfile.nullState.2")}
                  </p>
                </NullState>
              )}
            </div>
          )}
        </div>
      </PageContent>
      <PageFooter className="px-4 py-2">
        <div className="mx-auto max-w-page">
          <Button
            size="lg"
            className="w-full"
            disabled={!isUpdatePending || !inputIsValid}
            onClick={() => void save()}
          >
            {t("pages.myProfile.save")}
          </Button>
        </div>
      </PageFooter>
    </>
  );
};
