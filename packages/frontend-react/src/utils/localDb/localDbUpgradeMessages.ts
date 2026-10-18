export interface LocalDbUpgradeMessages {
  confirm: string;
  notRefreshed: string;
}

const DEFAULT_MESSAGES: LocalDbUpgradeMessages = {
  confirm:
    "A new version of the app is available. The app will refresh to load the new version",
  notRefreshed: "The app will not work correctly until it is refreshed",
};

let messages: LocalDbUpgradeMessages = DEFAULT_MESSAGES;

export const setLocalDbUpgradeMessages = (
  localDbUpgradeMessages: LocalDbUpgradeMessages,
) => {
  messages = localDbUpgradeMessages;
};

export const getLocalDbUpgradeMessages = (): LocalDbUpgradeMessages => {
  return messages;
};
