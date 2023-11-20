import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { AssistantPage } from "./assistant.page";

import { GlobalModule } from "~/global.module";
import { LogoIconModule } from "../../../components/logo-icon/logo-icon.module";
import { NullStateModule } from "../../../components/null-state/null-state.module";

@NgModule({
  declarations: [AssistantPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: AssistantPage,
      },
    ]),
    LogoIconModule,
    NullStateModule,
    FormsModule,
    ReactiveFormsModule,
  ],
})
export class AssistantPageModule {}
