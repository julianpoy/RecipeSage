import { NgModule } from "@angular/core";
import { ServerModule } from "@angular/platform-server";

import { AppModule } from "./app.module";
import { AppComponent } from "./app.component";

import { IonicServerModule } from "@ionic/angular-server";

@NgModule({
  imports: [AppModule, ServerModule, IonicServerModule],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
