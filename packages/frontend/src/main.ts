import { enableProdMode } from "@angular/core";
import { platformBrowserDynamic } from "@angular/platform-browser-dynamic";
import { defineCustomElements } from "@ionic/pwa-elements/loader";

import { AppModule } from "./app/app.module";
import { environment } from "./environments/environment";

defineCustomElements(window);

if (environment.production) {
  enableProdMode();
}

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.log(err));
