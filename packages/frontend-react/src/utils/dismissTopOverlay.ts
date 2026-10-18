const OPEN_OVERLAY_SELECTOR = [
  "[data-open][role='dialog']",
  "[data-open][role='alertdialog']",
  "[data-open][role='menu']",
  "[data-open][role='listbox']",
].join(",");

export const dismissTopOverlay = (): boolean => {
  if (!document.querySelector(OPEN_OVERLAY_SELECTOR)) return false;

  const target = document.activeElement || document.body;
  target.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Escape",
      code: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  return true;
};
