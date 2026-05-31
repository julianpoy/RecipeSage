import { translate } from "../translate";
import {
  getEmailSignatureHtml,
  getEmailSignaturePlain,
} from "./util/emailSignature";
import { sendEmail } from "./util/sendEmail";

export const sendPasswordResetEmail = async (args: {
  toAddresses: string[];
  ccAddresses: string[];
  resetLink: string;
  language: string;
}) => {
  const t = (key: string, values?: Record<string, string>) =>
    translate(args.language, key, values);

  const [
    subject,
    greeting,
    intro,
    disregardNotice,
    resetLinkText,
    copyUrlFallback,
    pasteUrlInstruction,
    signatureHtml,
    signaturePlain,
  ] = await Promise.all([
    t("emails.passwordReset.subject"),
    t("emails.passwordReset.greeting"),
    t("emails.passwordReset.intro"),
    t("emails.passwordReset.disregardNotice"),
    t("emails.passwordReset.resetLinkText"),
    t("emails.passwordReset.copyUrlFallback", { resetLink: args.resetLink }),
    t("emails.passwordReset.pasteUrlInstruction", {
      resetLink: args.resetLink,
    }),
    getEmailSignatureHtml(args.language),
    getEmailSignaturePlain(args.language),
  ]);

  const html =
    `${greeting}<br /><br />` +
    `${intro}<br /><br />` +
    `${disregardNotice}<br /><br />` +
    `<a href="${args.resetLink}">${resetLinkText}</a><br />` +
    `${copyUrlFallback}<br />` +
    signatureHtml;

  const plain =
    `${greeting}\n\n` +
    `${intro}\n` +
    `${disregardNotice}\n\n` +
    `${pasteUrlInstruction}\n\n` +
    signaturePlain;

  await sendEmail({
    toAddresses: args.toAddresses,
    ccAddresses: args.ccAddresses,
    subject,
    html,
    plain,
  });
};
