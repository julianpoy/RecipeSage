import { provideTranslateService } from "@ngx-translate/core";
import { provideTranslateHttpLoader } from "@ngx-translate/http-loader";
import { SupportedLanguages } from "@recipesage/util/shared";

export function provideTranslate() {
  return [
    ...provideTranslateService({
      fallbackLang: SupportedLanguages.EN_US,
    }),
    ...provideTranslateHttpLoader({
      prefix: "assets/i18n/",
      suffix: `.json?version=${APP_VERSION}`,
    }),
  ];
}
