import { Capacitor } from "@capacitor/core";

export const IS_NATIVE_IOS = Capacitor.getPlatform() === "ios";
