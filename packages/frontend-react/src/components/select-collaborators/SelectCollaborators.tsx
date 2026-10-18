import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2Icon } from "lucide-react";
import type { UserPublic } from "@recipesage/prisma";
import { useActionQuery } from "../../hooks/useActionQuery";
import { usePropSyncedState } from "../../hooks/usePropSyncedState";
import { serverActions } from "../../services/serverActions";
import { SelectUser } from "../select-user/SelectUser";

export const SelectCollaborators = ({
  selectedCollaboratorIds: selectedCollaboratorIdsInput,
  onSelectedCollaboratorIdsChanged,
}: {
  selectedCollaboratorIds: string[];
  onSelectedCollaboratorIdsChanged?: (ids: string[]) => void;
}) => {
  const { t } = useTranslation();
  const [selectedCollaboratorIds, setSelectedCollaboratorIds] =
    usePropSyncedState(selectedCollaboratorIdsInput);
  const [initialIds] = useState(selectedCollaboratorIdsInput);
  const [addedProfiles, setAddedProfiles] = useState<UserPublic[]>([]);

  const initialProfilesQuery = useActionQuery(
    ["users.getUserProfilesById", { ids: initialIds }],
    () =>
      serverActions.users.getUserProfilesById({
        ids: initialIds,
      }),
    { enabled: initialIds.length > 0 },
  );

  const userProfilesById = new Map<string, UserPublic>();
  for (const userProfile of initialProfilesQuery.data || []) {
    userProfilesById.set(userProfile.id, userProfile);
  }
  for (const userProfile of addedProfiles) {
    userProfilesById.set(userProfile.id, userProfile);
  }

  const update = (ids: string[]) => {
    setSelectedCollaboratorIds(ids);
    onSelectedCollaboratorIdsChanged?.(ids);
  };

  const addCollaborator = (userProfile: UserPublic | undefined) => {
    if (!userProfile) return;
    if (selectedCollaboratorIds.includes(userProfile.id)) return;

    setAddedProfiles((prev) => [...prev, userProfile]);
    update([...selectedCollaboratorIds, userProfile.id]);
  };

  const removeCollaborator = (userId: string) => {
    update(selectedCollaboratorIds.filter((id) => id !== userId));
  };

  return (
    <div>
      <h2 className="mb-2 text-base font-medium">
        {t("components.selectCollaborators.title")}
      </h2>

      <div className="flex flex-wrap gap-1 ps-2.5">
        {selectedCollaboratorIds.map((userId) => (
          <span
            key={userId}
            className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-2 text-base text-foreground"
          >
            <button
              type="button"
              className="flex items-center rounded-md text-muted-foreground hover:text-destructive"
              aria-label={t("generic.delete")}
              onClick={() => removeCollaborator(userId)}
            >
              <Trash2Icon className="size-5" />
            </button>
            <span dir="auto">{userProfilesById.get(userId)?.name || "--"}</span>
          </span>
        ))}
      </div>

      <SelectUser
        onSelectedUserChange={addCollaborator}
        enableSelectedMode={false}
        excludeUserIds={selectedCollaboratorIds}
      />
    </div>
  );
};
