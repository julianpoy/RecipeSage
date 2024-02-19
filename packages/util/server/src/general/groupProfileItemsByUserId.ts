import { ProfileItem } from "@prisma/client";

export const groupProfileItemsByUserId = (profileItems: ProfileItem[]) => {
  const profileItemsByUserId = profileItems.reduce(
    (acc, profileItem) => {
      acc[profileItem.userId] ??= [];
      acc[profileItem.userId].push(profileItem);
      return acc;
    },
    {} as { [key: string]: ProfileItem[] },
  );

  return profileItemsByUserId;
};
