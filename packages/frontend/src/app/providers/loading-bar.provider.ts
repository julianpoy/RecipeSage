import { importProvidersFrom } from "@angular/core";
import { LoadingBarModule } from "@ngx-loading-bar/core";

export function provideLoadingBar() {
  return importProvidersFrom(LoadingBarModule);
}
