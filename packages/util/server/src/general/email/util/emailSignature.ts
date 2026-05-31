import { translate } from "../../translate";

export const getEmailSignatureHtml = async (
  language: string,
): Promise<string> => {
  const [closing, role, socialHeader] = await Promise.all([
    translate(language, "emails.signature.closing"),
    translate(language, "emails.signature.role"),
    translate(language, "emails.signature.socialHeader"),
  ]);

  return (
    `<br /><br />${closing}` +
    `<br />Julian Poyourow` +
    `<br />${role} - <a href="https://recipesage.com">https://recipesage.com</a>` +
    `<br /><br /><b>${socialHeader}</b><br />` +
    `Discord: <a href="https://discord.gg/yCfzBft">https://discord.gg/yCfzBft</a><br />` +
    `Facebook: <a href="https://www.facebook.com/recipesageofficial/">https://www.facebook.com/recipesageofficial/</a><br />` +
    `Instagram: <a href="https://www.instagram.com/recipesageofficial/">https://www.instagram.com/recipesageofficial/</a><br />`
  );
};

export const getEmailSignaturePlain = async (
  language: string,
): Promise<string> => {
  const [closing, role, socialHeader] = await Promise.all([
    translate(language, "emails.signature.closing"),
    translate(language, "emails.signature.role"),
    translate(language, "emails.signature.socialHeader"),
  ]);

  return [
    closing,
    "Julian Poyourow",
    `${role} - https://recipesage.com`,
    "",
    socialHeader,
    "https://discord.gg/yCfzBft",
    "https://www.facebook.com/recipesageofficial/",
    "https://www.instagram.com/recipesageofficial/",
  ].join("\n");
};
