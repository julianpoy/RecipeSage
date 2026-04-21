import { mergeApplicationConfig, ApplicationConfig } from "@angular/core";
import { provideServerRendering, withRoutes } from "@angular/ssr";

import { appConfig } from "./app.config";
import { serverRoutes } from "./app.routes.server";
import { provideServerTranslateLoader } from "./providers/translate.server.provider";

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    ...provideServerTranslateLoader(),
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
