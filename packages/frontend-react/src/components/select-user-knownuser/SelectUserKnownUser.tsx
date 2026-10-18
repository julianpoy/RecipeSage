import { useState } from "react";
import type { UserPublic } from "@recipesage/prisma";
import { SelectKnownUser } from "../select-knownuser/SelectKnownUser";
import { SelectUser } from "../select-user/SelectUser";

export const SelectUserKnownUser = ({
  onSelectedUserChange,
}: {
  onSelectedUserChange?: (user: UserPublic | undefined) => void;
}) => {
  const [manualSelect, setManualSelect] = useState(false);

  return (
    <div>
      <SelectUser
        onSelectedUserChange={onSelectedUserChange}
        onSearchInputChange={(searchText) =>
          setManualSelect(!!searchText.trim())
        }
      />
      {!manualSelect && (
        <SelectKnownUser onSelectedUserChange={onSelectedUserChange} />
      )}
    </div>
  );
};
