import { HttpClient } from "@angular/common/http";
import { provideTranslateService, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { SupportedLanguages } from "@recipesage/util/shared";

export function createTranslateLoader(http: HttpClient) {
  const prefix = "assets/i18n/";
  const suffix = `.json?version=${(window as any).version}`;
  return new TranslateHttpLoader(http, prefix, suffix);
}

export function provideTranslate() {
  return provideTranslateService({
    loader: {
      provide: TranslateLoader,
      useFactory: createTranslateLoader,
      deps: [HttpClient],
    },
    defaultLanguage: SupportedLanguages.EN_US,
  });
}
