export const pruneDomForClip = (): string => {
  const clone = document.documentElement.cloneNode(true);
  if (!(clone instanceof Element)) {
    return document.documentElement.outerHTML;
  }

  clone
    .querySelectorAll(
      'script:not([type*="ld+json" i]), style, svg, noscript, template, iframe',
    )
    .forEach((node) => node.remove());

  return `<!DOCTYPE html>${clone.outerHTML}`;
};
