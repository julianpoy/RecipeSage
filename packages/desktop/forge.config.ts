import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { MakerDMG } from "@electron-forge/maker-dmg";
import MakerAppImage from "@reforged/maker-appimage";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";

const { APPLE_API_KEY_PATH, APPLE_API_KEY_ID, APPLE_API_ISSUER } = process.env;

const DESCRIPTION =
  "Manage your recipes, meal plans, and shopping lists with RecipeSage";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: "RecipeSage",
    icon: "./icons/recipesage",
    executableName: "recipesage-desktop",
    appBundleId: "com.recipesage.desktop",
    extraResource: ["./renderer", "./icons"],
    osxSign: {
      ...(process.env.CI ? { keychain: "build.keychain" } : {}),
    },
    ...(APPLE_API_KEY_PATH && APPLE_API_KEY_ID && APPLE_API_ISSUER
      ? {
          osxNotarize: {
            appleApiKey: APPLE_API_KEY_PATH,
            appleApiKeyId: APPLE_API_KEY_ID,
            appleApiIssuer: APPLE_API_ISSUER,
          },
        }
      : {}),
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({
      name: "RecipeSage",
      setupIcon: "./icons/recipesage.ico",
      iconUrl: "https://static.recipesage.com/desktop/recipesage.ico",
      description: DESCRIPTION,
      remoteReleases: "https://static.recipesage.com/desktop/prod/win32/x64",
    }),
    new MakerZIP(
      {
        macUpdateManifestBaseUrl:
          "https://static.recipesage.com/desktop/prod/darwin",
      },
      ["darwin", "linux"],
    ),
    new MakerDMG({
      name: "RecipeSage",
      icon: "./icons/recipesage.icns",
    }),
    new MakerRpm({
      options: {
        icon: "./icons/recipesage.png",
        description: DESCRIPTION,
      },
    }),
    new MakerDeb({
      options: {
        maintainer: "RecipeSage",
        homepage: "https://recipesage.com",
        icon: "./icons/recipesage.png",
        description: DESCRIPTION,
      },
    }),
    new MakerAppImage({
      options: {
        name: "recipesage-desktop",
        bin: "recipesage-desktop",
        productName: "RecipeSage",
        genericName: "Recipe Manager",
        icon: "./icons/recipesage.png",
        categories: ["Utility"],
      },
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        {
          entry: "src/main/main.ts",
          config: "vite.config.ts",
          target: "main",
        },
        {
          entry: "src/main/preload.ts",
          config: "vite.config.ts",
          target: "preload",
        },
      ],
      renderer: [],
    }),
  ],
};

export default config;
