import { dedent } from "ts-dedent";
import { emailSignatureHtml, emailSignaturePlain } from "./util/emailSignature";
import { sendEmail } from "./util/sendEmail";

export const sendPasswordResetEmail = async (args: {
  toAddresses: string[];
  ccAddresses: string[];
  resetLink: string;
}) => {
  const subject = "RecipeSage Password Reset";

  const html = dedent`
    Hello,

    <br /><br />Someone recently requested a password reset link for the RecipeSage account associated with this email address.
    <br /><br />If you did not request a password reset, please disregard this email.

    <br /><br /><a href="${args.resetLink}">Click here to reset your password</a>
    <br />or paste this url into your browser: ${args.resetLink}

    <br />

    ${emailSignatureHtml}
  `;

  const plain = dedent`
    Hello,

    Someone recently requested a password reset link for the RecipeSage account associated with this email address.
    If you did not request a password reset, please disregard this email.

    To reset your password, paste this url into your browser: ${args.resetLink}

    ${emailSignaturePlain}
  `;

  await sendEmail({
    toAddresses: args.toAddresses,
    ccAddresses: args.ccAddresses,
    subject,
    html,
    plain,
  });
};
