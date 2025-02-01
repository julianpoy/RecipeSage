import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { PipesModule } from "~/pipes/pipes.module";
import { SelectCollaboratorsComponent } from "./select-collaborators.component";
import { GlobalModule } from "~/global.module";
import { SelectUserModule } from "../select-user/select-user.module";

@NgModule({
  declarations: [SelectCollaboratorsComponent],
  imports: [
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    PipesModule,
    GlobalModule,
    SelectUserModule,
  ],
  exports: [SelectCollaboratorsComponent],
})
export class SelectCollaboratorsModule {}
