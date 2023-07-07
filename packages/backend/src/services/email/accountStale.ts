import { dedent } from "ts-dedent";
import { signatureHtml, signaturePlain } from "./util/signature";
import { sendMail } from "./util/sendMail";

export const sendAccountStale = async (to: string[], ccTo: string[]) => {
  const subject = "Action Required! Your recipes may be subject to deletion.";

  const html = dedent`
    Hello RecipeSage User!<br />

    <br /><br />It's been a very long time since you've logged into RecipeSage. If you'd like to keep your account, please login to your account. If you choose not to login, your RecipeSage account along with all associated data will be removed in the next few days.
    <br /><br />

    Please feel free to contact me if you have questions, concerns or comments at <a href="mailto:julian@recipesage.com?subject=RecipeSage%20Support">julian@recipesage.com</a>.

    <br />

    ${signatureHtml}
  `;

  const plain = dedent`
    Hello RecipeSage User!


    It's been a very long time since you've logged into RecipeSage. If you'd like to keep your account, please login to your account. If you choose not to login, your RecipeSage account along with all associated data will be removed in the next few days.

    Please feel free to contact me if you have questions, concerns or comments at julian@recipesage.com.


    ${signaturePlain}
  `;

  await sendMail(to, ccTo, subject, html, plain);
};
