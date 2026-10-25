export const getScrollbarWidth = (): number => {
  const element = document.createElement("div");
  element.style.cssText =
    "position: absolute; visibility: hidden; overflow: scroll; width: 100px; height: 100px;";
  document.body.appendChild(element);
  const scrollbarWidth = element.offsetWidth - element.clientWidth;
  element.remove();

  return scrollbarWidth;
};
