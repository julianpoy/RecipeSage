let pendingChanges = false;

export const unsavedChanges = {
  setPendingChanges() {
    pendingChanges = true;
  },

  hasPendingChanges() {
    return pendingChanges;
  },

  clearPendingChanges() {
    pendingChanges = false;
  },
};
