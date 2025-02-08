import { dedent } from "ts-dedent";
import { emailSignatureHtml, emailSignaturePlain } from "./util/emailSignature";
import { sendEmail } from "./util/sendEmail";

export const sendWelcomeEmail = async (args: {
  toAddresses: string[];
  ccAddresses: string[];
}) => {
  const subject = "Welcome to RecipeSage!";

  const html = dedent`
    Welcome to RecipeSage!<br />

    <br /><br />Thanks for joining our community of recipe collectors!
    <br /><br />

    You can access the RecipeSage user guide for more information about using the application: <a href="https://docs.recipesage.com">https://docs.recipesage.com</a>

    <br /><br />

    Please feel free to contact me if you have questions, concerns or comments via <a href="https://discord.gg/yCfzBft">Discord</a>.

    For any sensitive or urgent matters, you can contact me at julian@recipesage.com.

    <br />

    ${emailSignatureHtml}
  `;

  const plain = dedent`
    Welcome to RecipeSage!


    Thanks for joining our community of recipe collectors!

    You can access the RecipeSage user guide for more information about using the application: https://docs.recipesage.com

    Please feel free to contact me if you have questions, concerns or comments via Discord https://discord.gg/yCfzBft.

    For any sensitive or urgent matters, you can contact me at julian@recipesage.com.


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
