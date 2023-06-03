import { dedent } from "ts-dedent";
import { signatureHtml, signaturePlain } from "./util/signature";
import { sendMail } from "./util/sendMail";

export const sendWelcome = async (to: string[], ccTo: string[]) => {
  const subject = "Welcome to RecipeSage!";

  const html = dedent`
    Welcome to RecipeSage!<br />

    <br /><br />Thanks for joining our community of recipe collectors!
    <br /><br />

    You can access the RecipeSage user guide for more information about using the application: <a href="https://docs.recipesage.com">https://docs.recipesage.com</a>

    <br /><br />

    Please feel free to contact me if you have questions, concerns or comments at <a href="mailto:julian@recipesage.com?subject=RecipeSage%20Support">julian@recipesage.com</a>.

    <br />

    ${signatureHtml}
  `;

  const plain = dedent`
    Welcome to RecipeSage!


    Thanks for joining our community of recipe collectors!

    You can access the RecipeSage user guide for more information about using the application: https://docs.recipesage.com

    Please feel free to contact me if you have questions, concerns or comments at julian@recipesage.com.


    ${signaturePlain}
  `;

  await sendMail(to, ccTo, subject, html, plain);
};
