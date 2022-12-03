const { dedent } = require('ts-dedent');

const UtilService = require('../services/util');
const { signatureHtml, signaturePlain } = require('./util/signature');

const sendWelcome = async (to, ccTo) => {
  const subject = 'Welcome to RecipeSage!';

  const html = dedent`
    Welcome to RecipeSage!<br />

    <br /><br />Thanks for joining our community of recipe collectors!
    <br /><br />

    Please feel free to contact me if you have questions, concerns or comments at <a href="mailto:julian@recipesage.com?subject=RecipeSage%20Support">julian@recipesage.com</a>.

    <br />

    ${signatureHtml}
  `;

  const plain = dedent`
    Welcome to RecipeSage!


    Thanks for joining our community of recipe collectors!

    Please feel free to contact me if you have questions, concerns or comments at julian@recipesage.com.


    ${signaturePlain}
  `;

  await UtilService.sendmail(to, ccTo, subject, html, plain);
};

module.exports = {
  sendWelcome,
};

