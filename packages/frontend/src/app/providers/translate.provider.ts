import { HttpClient } from "@angular/common/http";
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";
import { importProvidersFrom } from "@angular/core";
import { SupportedLanguages } from "@recipesage/util/shared";

export function createTranslateLoader(http: HttpClient) {
  const prefix = "assets/i18n/";
  const suffix = `.json?version=${(window as any).version}`;
  return new TranslateHttpLoader(http, prefix, suffix);
}

export function provideTranslate() {
  return importProvidersFrom(
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: createTranslateLoader,
        deps: [HttpClient],
      },
      defaultLanguage: SupportedLanguages.EN_US,
    }),
  );
}
