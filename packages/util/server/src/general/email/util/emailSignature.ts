import { dedent } from "ts-dedent";

export const emailSignatureHtml = dedent`
  <br /><br />Best,
  <br />Julian Poyourow
  <br />Developer of RecipeSage - <a href="https://recipesage.com">https://recipesage.com</a>
  <br /><br />
  <b>Social:</b><br />
  Discord: <a href="https://discord.gg/yCfzBft">https://discord.gg/yCfzBft</a><br />
  Facebook: <a href="https://www.facebook.com/recipesageofficial/">https://www.facebook.com/recipesageofficial/</a><br />
  Instagram: <a href="https://www.instagram.com/recipesageofficial/">https://www.instagram.com/recipesageofficial/</a><br />
`;

export const emailSignaturePlain = dedent`
  Best,
  Julian Poyourow
  Developer of RecipeSage - https://recipesage.com

  Social:
  https://discord.gg/yCfzBft
  https://www.facebook.com/recipesageofficial/
  https://www.instagram.com/recipesageofficial/
`;
