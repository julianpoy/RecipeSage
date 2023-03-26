const { dedent } = require('ts-dedent');

const UtilService = require('../services/util');
const { signatureHtml, signaturePlain } = require('./util/signature');

const sendPasswordReset = async (to, ccTo, args) => {
  const subject = 'RecipeSage Password Reset';

  const html = dedent`
    Hello,

    <br /><br />Someone recently requested a password reset link for the RecipeSage account associated with this email address.
    <br /><br />If you did not request a password reset, please disregard this email.

    <br /><br /><a href="${args.resetLink}">Click here to reset your password</a>
    <br />or paste this url into your browser: ${args.resetLink}

    <br />

    ${signatureHtml}
  `;

  const plain = dedent`
    Hello,

    Someone recently requested a password reset link for the RecipeSage account associated with this email address.
    If you did not request a password reset, please disregard this email.

    To reset your password, paste this url into your browser: ${args.resetLink}

    ${signaturePlain}
  `;

  await UtilService.sendmail(to, ccTo, subject, html, plain);
};

module.exports = {
  sendPasswordReset,
};

