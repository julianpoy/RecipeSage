import { isPlatform } from "@ionic/angular";

import { getIsElectron } from "./electron";

const userAgent = navigator.userAgent;
const isMacOS = /Macintosh/.test(userAgent);
const isSafari =
  /Safari\//.test(userAgent) &&
  !/Chrome|Chromium|CriOS|FxiOS|Firefox|Edg|OPR/.test(userAgent);

export const USE_IOS_MODE =
  isPlatform("ios") || (isMacOS && (isSafari || getIsElectron()));
