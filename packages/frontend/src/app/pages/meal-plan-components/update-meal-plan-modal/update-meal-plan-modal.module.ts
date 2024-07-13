import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { UpdateMealPlanModalPage } from "./update-meal-plan-modal.page";
import { SelectCollaboratorsModule } from "~/components/select-collaborators/select-collaborators.module";

import { GlobalModule } from "~/global.module";

@NgModule({
  declarations: [UpdateMealPlanModalPage],
  imports: [
    GlobalModule,
    CommonModule,
    IonicModule,
    FormsModule,
    ReactiveFormsModule,
    SelectCollaboratorsModule,
  ],
})
export class UpdateMealPlanModalPageModule {}
