// If a handle matches this regexp, it is invalid
const EVIL_HANDLE_REGEXP = /[^A-Za-z0-9_.]/;

// Handles may not contain these words
const HANDLE_DENYLIST = ["recipesage", "admin"];

export const isHandleValid = (handle: string): boolean => {
  if (!handle) return false;
  if (handle.match(EVIL_HANDLE_REGEXP)) return false;
  if (handle.length > 50) return false;

  for (let i = 0; i < HANDLE_DENYLIST.length; i++) {
    if (handle.toLowerCase().indexOf(HANDLE_DENYLIST[i]) > -1) return false;
  }

  return true;
};
