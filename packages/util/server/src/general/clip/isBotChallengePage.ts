export const isBotChallengePage = (html: string): boolean => {
  const lower = html.toLowerCase();
  return (
    lower.includes("<title>just a moment...</title>") ||
    lower.includes("<title>attention required!</title>") ||
    lower.includes("<title>access denied</title>") ||
    lower.includes("<title>client challenge</title>")
  );
};
