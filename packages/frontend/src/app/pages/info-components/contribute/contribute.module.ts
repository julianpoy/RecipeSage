import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { ContributePage } from "./contribute.page";
import { LogoIconModule } from "~/components/logo-icon/logo-icon.module";
import { TosClickwrapAgreementModule } from "~/components/tos-clickwrap-agreement/tos-clickwrap-agreement.module";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [ContributePage],
  imports: [
    CommonModule,
    IonicModule,
    RouterModule.forChild([
      {
        path: "",
        component: ContributePage,
      },
    ]),
    GlobalModule,
    FormsModule,
    ReactiveFormsModule,
    LogoIconModule,
    TosClickwrapAgreementModule,
  ],
})
export class ContributePageModule {}
