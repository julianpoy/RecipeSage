import LinkifyStr from 'linkify-string';

export const linkifyStr = (str: string) => {
  return LinkifyStr(str, {
    target: (href, type) => {
      if (type !== 'url') return;
      if (href.includes('recipesage.com')) return; // All recipesage.com should open in same tab
      return '_blank';
    },
    className: 'linkified'
  });
}
